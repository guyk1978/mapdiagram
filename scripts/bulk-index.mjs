/**
 * Submit recently updated blog/tool URLs to the Google Indexing API (URL_UPDATED).
 *
 * Prerequisites:
 * - google-credentials.json at project root (service account with Indexing API scope)
 * - Service account email added as Owner in Google Search Console for the property
 * - "Web Search Indexing API" enabled in Google Cloud Console
 *
 * Usage:
 *   node scripts/bulk-index.mjs              # last 14 days, max 200/run
 *   node scripts/bulk-index.mjs --days 7
 *   node scripts/bulk-index.mjs --dry-run
 *   node scripts/bulk-index.mjs --force      # re-submit even if already sent
 *   node scripts/bulk-index.mjs --limit 50
 */
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DEFAULT_CREDENTIALS = path.join(root, "google-credentials.json");
const DEFAULT_SITEMAP = path.join(root, "sitemap.xml");
const DEFAULT_STATE = path.join(root, ".indexing-queue-state.json");
const DEFAULT_DAILY_LIMIT = 200;
const DEFAULT_RECENT_DAYS = 14;
const REQUEST_DELAY_MS = 350;

const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";

function parseArgs(argv) {
  const opts = {
    days: DEFAULT_RECENT_DAYS,
    limit: DEFAULT_DAILY_LIMIT,
    dryRun: false,
    force: false,
    all: false,
    only: "both",
    credentials: DEFAULT_CREDENTIALS,
    sitemap: DEFAULT_SITEMAP,
    state: DEFAULT_STATE,
    fetchRemote: false,
    baseUrl: "",
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--force") opts.force = true;
    else if (arg === "--all") opts.all = true;
    else if (arg === "--fetch-remote") opts.fetchRemote = true;
    else if (arg === "--days" && argv[i + 1]) opts.days = Math.max(1, Number(argv[++i]) || DEFAULT_RECENT_DAYS);
    else if (arg === "--limit" && argv[i + 1]) opts.limit = Math.max(1, Number(argv[++i]) || DEFAULT_DAILY_LIMIT);
    else if (arg === "--only" && argv[i + 1]) {
      const v = String(argv[++i]).toLowerCase();
      if (v === "blog" || v === "tools" || v === "both") opts.only = v;
    } else if (arg === "--credentials" && argv[i + 1]) opts.credentials = path.resolve(root, argv[++i]);
    else if (arg === "--sitemap" && argv[i + 1]) opts.sitemap = path.resolve(root, argv[++i]);
    else if (arg === "--state" && argv[i + 1]) opts.state = path.resolve(root, argv[++i]);
    else if (arg === "--base-url" && argv[i + 1]) opts.baseUrl = String(argv[++i]).replace(/\/+$/, "");
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.warn("[bulk-index] Unknown argument:", arg);
    }
  }

  opts.limit = Math.min(opts.limit, DEFAULT_DAILY_LIMIT);
  return opts;
}

function printHelp() {
  console.log(`
bulk-index.mjs — Google Indexing API (URL_UPDATED)

Options:
  --days <n>           Include URLs with lastmod in the last N days (default: ${DEFAULT_RECENT_DAYS})
  --limit <n>          Max submissions this run (cap: ${DEFAULT_DAILY_LIMIT}/day)
  --only blog|tools|both   Filter URL types (default: both)
  --dry-run            Print URLs without calling the API
  --force              Re-submit URLs already recorded in state
  --all                Ignore --days filter (still skips unchanged unless --force)
  --fetch-remote       Fetch sitemap from live site instead of local file
  --credentials <path> Service account JSON (default: google-credentials.json)
  --sitemap <path>     Local sitemap path (default: sitemap.xml)
  --state <path>       Submission ledger (default: .indexing-queue-state.json)
  --base-url <url>     Override base URL when parsing
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  if (!value) return null;
  const d = new Date(value.length === 10 ? value + "T12:00:00.000Z" : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function parseSitemapXml(xml) {
  const urls = [];
  const blocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || [];
  for (const block of blocks) {
    const loc = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1]?.trim();
    const lastmod = block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i)?.[1]?.trim();
    if (loc) urls.push({ loc, lastmod: lastmod || null });
  }
  return urls;
}

async function loadSitemapXml(opts, baseUrl) {
  let xml = "";
  if (opts.fetchRemote) {
    const sitemapUrl = (baseUrl || "https://mapdiagram.com") + "/sitemap.xml";
    console.log("[bulk-index] Fetching remote sitemap:", sitemapUrl);
    const res = await fetch(sitemapUrl);
    if (!res.ok) throw new Error("Failed to fetch sitemap: HTTP " + res.status);
    xml = await res.text();
  } else {
    xml = await readFile(opts.sitemap, "utf8");
    console.log("[bulk-index] Loaded local sitemap:", opts.sitemap);
  }
  return parseSitemapXml(xml);
}

/** Enrich lastmod from blog.json + tools.json when sitemap dates are stale. */
async function loadRegistryLastmods() {
  const map = new Map();
  try {
    const toolsPath = path.join(root, "assets", "data", "tools.json");
    const blogPath = path.join(root, "assets", "data", "blog.json");
    const registry = JSON.parse(await readFile(toolsPath, "utf8"));
    const blogRegistry = JSON.parse(await readFile(blogPath, "utf8"));
    const baseUrl = (registry.site?.baseUrl || "https://mapdiagram.com").replace(/\/+$/, "");

    for (const tool of registry.tools || []) {
      const lastmod = tool.updatedAt || tool.lastmod || null;
      if (lastmod) map.set(baseUrl + "/tools/" + tool.slug + "/", lastmod);
    }
    for (const post of blogRegistry.blog || []) {
      if (post.publishDate) map.set(baseUrl + "/blog/" + post.slug + "/", post.publishDate);
      if (post.updatedAt) map.set(baseUrl + "/blog/" + post.slug + "/", post.updatedAt);
    }
    return { map, baseUrl };
  } catch (error) {
    console.warn("[bulk-index] Registry lastmod enrichment skipped:", error.message);
    return { map: new Map(), baseUrl: "" };
  }
}

function classifyUrl(loc) {
  try {
    const u = new URL(loc);
    const p = u.pathname;
    if (/^\/blog\/[^/]+\/?$/.test(p)) return "blog";
    if (/^\/tools\/[^/]+\/?$/.test(p)) return "tools";
    return null;
  } catch {
    return null;
  }
}

async function loadState(statePath) {
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      submitted: parsed.submitted && typeof parsed.submitted === "object" ? parsed.submitted : {},
      daily: parsed.daily && typeof parsed.daily === "object" ? parsed.daily : {},
    };
  } catch {
    return { submitted: {}, daily: {} };
  }
}

async function saveState(statePath, state) {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    submitted: state.submitted,
    daily: state.daily,
  };
  await writeFile(statePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

function countSubmittedToday(state) {
  const key = todayKey();
  return Number(state.daily[key]?.count || 0);
}

function isRecent(lastmod, cutoff) {
  const d = parseIsoDate(lastmod);
  if (!d) return false;
  return d >= cutoff;
}

function shouldSubmit(url, lastmod, state, opts) {
  const prev = state.submitted[url];
  if (!opts.force && prev) {
    if (prev.lastmod && lastmod && prev.lastmod === lastmod) return false;
    if (!lastmod && prev.submittedAt) {
      const submittedAt = parseIsoDate(prev.submittedAt);
      if (submittedAt && submittedAt >= daysAgo(30)) return false;
    }
  }
  return true;
}

function selectCandidates(sitemapUrls, registryMap, baseUrl, state, opts) {
  const cutoff = daysAgo(opts.days);
  const candidates = [];

  for (const entry of sitemapUrls) {
    const kind = classifyUrl(entry.loc);
    if (!kind) continue;
    if (opts.only === "blog" && kind !== "blog") continue;
    if (opts.only === "tools" && kind !== "tools") continue;

    const enrichedLastmod = registryMap.get(entry.loc) || entry.lastmod;
    if (!opts.all && !isRecent(enrichedLastmod, cutoff)) continue;
    if (!shouldSubmit(entry.loc, enrichedLastmod, state, opts)) continue;

    candidates.push({
      url: entry.loc,
      lastmod: enrichedLastmod || null,
      kind,
    });
  }

  candidates.sort((a, b) => {
    const da = parseIsoDate(a.lastmod)?.getTime() || 0;
    const db = parseIsoDate(b.lastmod)?.getTime() || 0;
    return db - da;
  });

  return candidates;
}

async function createIndexingClient(credentialsPath) {
  await access(credentialsPath);
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: [INDEXING_SCOPE],
  });
  const client = await auth.getClient();
  const indexing = google.indexing({ version: "v3", auth: client });
  const projectId = await auth.getProjectId().catch(() => null);
  const email =
    client.email ||
    (await readFile(credentialsPath, "utf8").then((t) => JSON.parse(t).client_email).catch(() => "unknown"));
  return { indexing, email, projectId };
}

async function publishUrl(indexing, url) {
  const res = await indexing.urlNotifications.publish({
    requestBody: {
      url,
      type: "URL_UPDATED",
    },
  });
  return res.data;
}

function formatApiError(error) {
  const status = error?.code || error?.response?.status;
  const data = error?.response?.data;
  const message = error?.message || "unknown error";
  const detail = data?.error?.message || JSON.stringify(data?.error || data || "");
  return { status, message, detail };
}

async function main() {
  const opts = parseArgs(process.argv);
  const state = await loadState(opts.state);
  const alreadyToday = countSubmittedToday(state);
  const remainingToday = Math.max(0, DEFAULT_DAILY_LIMIT - alreadyToday);
  const runLimit = Math.min(opts.limit, remainingToday);

  if (remainingToday === 0 && !opts.dryRun) {
    console.log(
      `[bulk-index] Daily cap reached (${DEFAULT_DAILY_LIMIT} URLs on ${todayKey()}). Try again tomorrow or use --dry-run.`
    );
    process.exit(0);
  }

  const { map: registryMap, baseUrl: registryBase } = await loadRegistryLastmods();
  const baseUrl = opts.baseUrl || registryBase || "https://mapdiagram.com";
  const sitemapUrls = await loadSitemapXml(opts, baseUrl);
  const candidates = selectCandidates(sitemapUrls, registryMap, baseUrl, state, opts);
  const batch = candidates.slice(0, runLimit);

  console.log("[bulk-index] Sitemap URLs:", sitemapUrls.length);
  console.log("[bulk-index] Candidates (blog/tools, filtered):", candidates.length);
  console.log("[bulk-index] Submitting this run:", batch.length, opts.dryRun ? "(dry-run)" : "");
  console.log("[bulk-index] Already submitted today:", alreadyToday, "/", DEFAULT_DAILY_LIMIT);

  if (batch.length === 0) {
    console.log("[bulk-index] Nothing to submit. Try --days 30, --all, or --force.");
    process.exit(0);
  }

  if (opts.dryRun) {
    for (const item of batch) {
      console.log("  ", item.kind.padEnd(5), item.lastmod || "no-lastmod", item.url);
    }
    process.exit(0);
  }

  const { indexing, email } = await createIndexingClient(opts.credentials);
  console.log("[bulk-index] Authenticated as service account:", email);
  console.log("[bulk-index] Reminder: this account must be Owner in Google Search Console for", baseUrl);

  let ok = 0;
  let fail = 0;
  const dayKey = todayKey();

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    try {
      await publishUrl(indexing, item.url);
      ok += 1;
      state.submitted[item.url] = {
        lastmod: item.lastmod,
        submittedAt: new Date().toISOString(),
        type: "URL_UPDATED",
        kind: item.kind,
      };
      state.daily[dayKey] = { count: (state.daily[dayKey]?.count || 0) + 1 };
      console.log(`[bulk-index] OK (${i + 1}/${batch.length})`, item.url);
    } catch (error) {
      fail += 1;
      const info = formatApiError(error);
      console.error(`[bulk-index] FAIL (${i + 1}/${batch.length})`, item.url);
      console.error("  status:", info.status, "message:", info.message);
      if (info.detail) console.error("  detail:", info.detail);

      if (info.status === 403) {
        console.error(
          "\n[bulk-index] 403 usually means:\n" +
            "  1) Web Search Indexing API is not enabled in Google Cloud,\n" +
            "  2) Service account is not added as Owner in Search Console,\n" +
            "  3) URL is not on a verified property.\n"
        );
        break;
      }
      if (info.status === 429) {
        console.error("[bulk-index] Quota exceeded — stopping early.");
        break;
      }
    }

    if (i < batch.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  await saveState(opts.state, state);
  console.log("[bulk-index] Done. success:", ok, "failed:", fail, "state:", opts.state);
  process.exit(fail > 0 && ok === 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("[bulk-index] Fatal:", error.message || error);
  process.exit(1);
});
