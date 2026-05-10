/**
 * MapDiagram AI gateway — SINGLE entry: JWT → reserve (DB) → OpenAI → finalize/refund.
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, OPENAI_API_KEY
 *
 * OpenAI is never called unless rpc_ai_reserve returns ok. Billing finalization must succeed
 * or the reserved credits are refunded via rpc_ai_finalize_failure.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-idempotency-key",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/** Must stay in sync with src/ai-service.ts BILLING_RESERVE_CREDITS_PER_CALL unless both are updated. */
function effectiveReserveCredits(): number {
  const raw = Deno.env.get("AI_RESERVE_CREDITS_PER_CALL");
  const n = raw ? parseInt(raw, 10) : 18;
  if (!Number.isFinite(n)) return 18;
  return Math.min(100, Math.max(1, n));
}

function effectiveMaxRpm(): number {
  const raw = Deno.env.get("AI_MAX_REQUESTS_PER_MINUTE");
  const n = raw ? parseInt(raw, 10) : 20;
  if (!Number.isFinite(n)) return 20;
  return Math.min(120, Math.max(5, n));
}

/** Reject unknown models (cost / abuse control). */
const ALLOWED_MODELS = new Set([
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
]);

function normalizeModel(m: string): string {
  return String(m || "").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function finalizeSuccessWithRetries(
  admin: ReturnType<typeof createClient>,
  params: {
    p_log_id: string;
    p_user_id: string;
    p_model: string;
    p_prompt_tokens: number;
    p_completion_tokens: number;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const max = 5;
  let lastMsg = "";
  for (let i = 0; i < max; i++) {
    const { error } = await admin.rpc("rpc_ai_finalize_success", params);
    if (!error) return { ok: true };
    lastMsg = error.message;
    console.error("rpc_ai_finalize_success attempt", i, error);
    await sleep(180 * (i + 1));
  }
  return { ok: false, error: lastMsg || "finalize_failed" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !openaiKey || !anonKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: {
    system?: string;
    user?: string;
    model?: string;
    idempotencyKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const system = String(body.system ?? "");
  const userMsg = String(body.user ?? "");
  const modelRaw = normalizeModel(String(body.model ?? "gpt-4o-mini"));
  const model = modelRaw || "gpt-4o-mini";
  if (!ALLOWED_MODELS.has(model)) {
    return new Response(JSON.stringify({ error: "model_not_allowed", allowed: [...ALLOWED_MODELS] }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const idem =
    (req.headers.get("x-idempotency-key") ?? body.idempotencyKey ?? "").trim() ||
    crypto.randomUUID();

  const MAX_USER_CHARS = 48_000;
  const MAX_SYSTEM_CHARS = 24_000;
  if (system.length > MAX_SYSTEM_CHARS || userMsg.length > MAX_USER_CHARS) {
    return new Response(JSON.stringify({ error: "payload_too_large" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const reserveCredits = effectiveReserveCredits();
  const maxRpm = effectiveMaxRpm();
  const admin = createClient(supabaseUrl, serviceKey);

  // In-flight idempotency retries: skip pre-check (credits already reserved for this key).
  const { data: existingRow } = await admin
    .from("ai_usage_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("idempotency_key", idem)
    .maybeSingle();

  if (!existingRow) {
    const { data: w } = await admin.from("user_wallets").select("credits").eq("user_id", user.id).maybeSingle();
    const pre = typeof w?.credits === "number" ? w.credits : Number(w?.credits ?? 0);
    const preBal = Number.isFinite(pre) ? pre : 0;
    if (preBal <= 0 || preBal < reserveCredits) {
      return new Response(
        JSON.stringify({ error: "insufficient_credits", balance: preBal, need: reserveCredits }),
        { status: 402, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
  }

  const { data: reserve, error: rErr } = await admin.rpc("rpc_ai_reserve", {
    p_user_id: user.id,
    p_idempotency_key: idem,
    p_reserved_credits: reserveCredits,
    p_max_requests_per_minute: maxRpm,
  });

  if (rErr) {
    console.error("reserve_rpc", rErr);
    return new Response(JSON.stringify({ error: "billing_error", detail: rErr.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const resv = reserve as Record<string, unknown>;
  if (!resv?.ok) {
    const err = String(resv?.error ?? "forbidden");
    const status = err === "insufficient_credits" ? 402 : err === "rate_limited" ? 429 : 400;
    return new Response(JSON.stringify({ error: err, balance: resv.balance }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const reused = resv.reused === true;
  const logId = String(resv.log_id ?? "");
  if (!logId) {
    return new Response(JSON.stringify({ error: "billing_invalid_log" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (reused) {
    const st = String(resv.status ?? "");
    if (st === "completed" || st === "failed_refunded") {
      return new Response(JSON.stringify({ error: "idempotency_replay", status: st }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  // From here: reserve succeeded for a new log, or resuming a reserved in-flight idempotency key.
  let completionText = "";
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    const ores = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    const raw = await ores.text();
    if (!ores.ok) {
      await admin.rpc("rpc_ai_finalize_failure", {
        p_log_id: logId,
        p_user_id: user.id,
        p_error: `openai_http_${ores.status}: ${raw.slice(0, 800)}`,
      });
      return new Response(JSON.stringify({ error: "openai_error", status: ores.status, body: raw.slice(0, 500) }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    completionText = parsed.choices?.[0]?.message?.content ?? "";
    promptTokens = parsed.usage?.prompt_tokens ?? 0;
    completionTokens = parsed.usage?.completion_tokens ?? 0;

    const fin = await finalizeSuccessWithRetries(admin, {
      p_log_id: logId,
      p_user_id: user.id,
      p_model: model,
      p_prompt_tokens: promptTokens,
      p_completion_tokens: completionTokens,
    });

    if (!fin.ok) {
      console.error("finalize_success exhausted; refunding reserve", logId, fin.error);
      await admin.rpc("rpc_ai_finalize_failure", {
        p_log_id: logId,
        p_user_id: user.id,
        p_error: `finalize_success_dropped: ${fin.error}`.slice(0, 1900),
      });
      return new Response(
        JSON.stringify({
          error: "billing_finalize_failed",
          message: "Credits were not charged; please retry.",
        }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        content: completionText,
        usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
        billing: { log_id: logId, reserve: reserveCredits },
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    await admin.rpc("rpc_ai_finalize_failure", {
      p_log_id: logId,
      p_user_id: user.id,
      p_error: String(e).slice(0, 1500),
    });
    return new Response(JSON.stringify({ error: "internal", message: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
