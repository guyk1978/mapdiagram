/**
 * Public flowchart publish + fetch.
 * POST (auth): publish snapshot → { slug, url, quality_score, is_indexable }
 * GET ?slug=: anonymous fetch + view_count increment
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_NODES = 25;
const MAX_EDGES = 30;
const MAX_JSON_BYTES = 512_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "flowchart";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  return `${base}-${suffix}`;
}

function qualityScore(data: Record<string, unknown>): { score: number; isIndexable: boolean } {
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const connections = Array.isArray(data.connections) ? data.connections : [];
  const title = String(data.title || data.name || "").trim();
  let score = 0;
  if (nodes.length >= 4 && nodes.length <= 22) score += 22;
  else if (nodes.length >= 3) score += 12;
  if (title.length >= 4 && title.length <= 80) score += 15;
  const labels = nodes.map((n) => {
    const r = n as Record<string, unknown>;
    return String(r.label || r.title || r.text || "").trim();
  }).filter(Boolean);
  if (labels.length) {
    const avg = labels.reduce((s, l) => s + l.length, 0) / labels.length;
    if (avg >= 4 && avg <= 28) score += 20;
    else score += 8;
  }
  const decisions = nodes.filter((n) => {
    const r = n as Record<string, unknown>;
    return r.kind === "decision" || r.type === "decision";
  }).length;
  if (decisions >= 1 && connections.length >= nodes.length) score += 18;
  else if (connections.length >= 2) score += 10;
  const editCount = Number(data.editCount || 0);
  score += Math.min(10, Math.max(0, editCount * 2));
  score = Math.min(100, Math.round(score));
  const isIndexable = score >= 62 && nodes.length >= 4 && title.length >= 4;
  return { score, isIndexable };
}

function validateSnapshot(data: unknown): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "invalid_data" };
  }
  const raw = JSON.stringify(data);
  if (raw.length > MAX_JSON_BYTES) return { ok: false, error: "diagram_too_large" };
  const o = data as Record<string, unknown>;
  const nodes = Array.isArray(o.nodes) ? o.nodes : [];
  const connections = Array.isArray(o.connections) ? o.connections : [];
  if (!nodes.length) return { ok: false, error: "empty_diagram" };
  if (nodes.length > MAX_NODES) return { ok: false, error: "too_many_nodes" };
  if (connections.length > MAX_EDGES) return { ok: false, error: "too_many_edges" };
  return { ok: true, data: o };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "").trim().toLowerCase();
    if (!slug || !/^[a-z0-9][a-z0-9-]{2,80}$/.test(slug)) {
      return json({ error: "invalid_slug" }, 400);
    }
    const { data: row, error } = await admin
      .from("public_flowcharts")
      .select("slug, title, data, quality_score, is_indexable, view_count, created_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error("fetch error", error);
      return json({ error: "fetch_failed" }, 500);
    }
    if (!row) return json({ error: "not_found" }, 404);

    await admin
      .from("public_flowcharts")
      .update({ view_count: (row.view_count || 0) + 1 })
      .eq("slug", slug);

    return json({
      slug: row.slug,
      title: row.title,
      data: row.data,
      quality_score: row.quality_score,
      is_indexable: row.is_indexable,
      view_count: (row.view_count || 0) + 1,
      created_at: row.created_at,
    });
  }

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const snap = validateSnapshot(body.data);
  if (!snap.ok) return json({ error: snap.error }, 400);

  const title = String(body.title || snap.data.title || snap.data.name || "Flowchart").trim().slice(0, 120);
  const { score, isIndexable } = qualityScore({ ...snap.data, title });
  const slug = slugify(title);

  const { data: inserted, error: insErr } = await admin
    .from("public_flowcharts")
    .insert({
      user_id: userId,
      slug,
      title,
      data: snap.data,
      quality_score: score,
      is_indexable: isIndexable,
    })
    .select("slug, title, quality_score, is_indexable, created_at")
    .single();

  if (insErr) {
    console.error("insert error", insErr);
    return json({ error: "publish_failed", detail: insErr.message }, 500);
  }

  const origin = req.headers.get("x-forwarded-host")
    ? `https://${req.headers.get("x-forwarded-host")}`
    : "https://mapdiagram.com";
  const publicUrl = `${origin}/app/view.html?slug=${inserted.slug}`;

  return json({
    slug: inserted.slug,
    title: inserted.title,
    quality_score: inserted.quality_score,
    is_indexable: inserted.is_indexable,
    url: publicUrl,
    created_at: inserted.created_at,
  });
});
