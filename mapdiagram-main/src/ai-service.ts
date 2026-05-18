/**
 * MapDiagram — calls Edge `ai-complete` via browser `fetch` (same endpoint as SDK).
 * Uses required Supabase headers: `apikey` (anon) + `Authorization: Bearer` (user JWT).
 */

export const BILLING_RESERVE_CREDITS_PER_CALL = 18;

export interface BillingGatewayConfig {
  /** e.g. https://xxxx.supabase.co (no trailing slash) */
  projectBaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  model?: string;
}

function randomIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function edgeLog(message: string, data: Record<string, unknown>) {
  try {
    console.info(`[MapDiagram][EdgeFn] ${message}`, { ...data, t: new Date().toISOString() });
  } catch {
    /* ignore */
  }
}

/**
 * One OpenAI chat completion through Supabase Edge `ai-complete` (reserve → OpenAI → finalize/refund).
 */
export async function completeOpenAiThroughBillingGateway(
  cfg: BillingGatewayConfig,
  system: string,
  userMessage: string,
): Promise<string> {
  const base = String(cfg.projectBaseUrl || "").trim().replace(/\/+$/, "");
  const anonKey = String(cfg.supabaseAnonKey || "").trim();
  const accessToken = String(cfg.accessToken || "").trim();
  if (!base || !anonKey || !accessToken) {
    edgeLog("blocked: missing projectBaseUrl, anon key, or access token", {
      baseLen: base.length,
      anonLen: anonKey.length,
      tokenLen: accessToken.length,
    });
    throw new Error("AI gateway not configured or not signed in.");
  }
  let host = "";
  try {
    host = new URL(base).hostname;
  } catch {
    host = "(bad_url)";
  }
  const url = `${base}/functions/v1/ai-complete`;
  const idem = randomIdempotencyKey();
  edgeLog("POST fetch ai-complete", {
    host,
    urlChars: url.length,
    anonKeyLen: anonKey.length,
    accessTokenLen: accessToken.length,
    idempotencyLen: idem.length,
  });

  const AI_FETCH_TIMEOUT_MS = 120_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "Content-Type": "application/json",
        "x-idempotency-key": idem,
      },
      body: JSON.stringify({
        system,
        user: userMessage,
        model: cfg.model ?? "gpt-4o-mini",
        idempotencyKey: idem,
      }),
    });
  } catch (err) {
    const e = err as Error;
    edgeLog("fetch threw", {
      errName: e?.name ?? "unknown",
      errMessage: (e?.message ?? String(err)).slice(0, 400),
    });
    if (e?.name === "AbortError") {
      throw new Error(`AI billing gateway timed out after ${AI_FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await res.text();
  edgeLog("fetch response", { httpStatus: res.status, ok: res.ok, bodyChars: raw.length });

  if (!res.ok) {
    let detail = raw;
    try {
      const j = JSON.parse(raw) as { error?: string; message?: string };
      detail = j.error || j.message || raw;
    } catch {
      /* ignore */
    }
    throw new Error(`AI billing gateway HTTP ${res.status}: ${String(detail).slice(0, 500)}`);
  }

  const data = JSON.parse(raw) as { content?: string; error?: string };
  if (data && typeof data.error === "string" && data.error) {
    throw new Error(data.error);
  }
  if (!data.content || typeof data.content !== "string") {
    throw new Error("AI billing gateway returned no content");
  }
  return data.content;
}
