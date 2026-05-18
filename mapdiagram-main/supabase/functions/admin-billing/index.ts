/**
 * Internal billing tools (balance, history, adjust, refund-style credit add).
 * Header: x-admin-secret must equal ADMIN_BILLING_SECRET
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.headers.get("x-admin-secret") !== Deno.env.get("ADMIN_BILLING_SECRET")) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "help";

  if (req.method === "GET" && action === "balance") {
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id_required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { data, error } = await admin.from("user_wallets").select("credits, updated_at").eq("user_id", userId).maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ user_id: userId, wallet: data }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (req.method === "GET" && action === "history") {
    const userId = url.searchParams.get("user_id");
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id_required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { data: tx, error: e1 } = await admin
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: logs, error: e2 } = await admin
      .from("ai_usage_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (e1 || e2) {
      return new Response(JSON.stringify({ error: e1?.message ?? e2?.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ transactions: tx, ai_usage_logs: logs }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST" && action === "adjust") {
    const j = await req.json().catch(() => null) as {
      user_id?: string;
      delta?: number;
      reason?: string;
    } | null;
    if (!j?.user_id || typeof j.delta !== "number") {
      return new Response(JSON.stringify({ error: "user_id_and_delta_required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { data, error } = await admin.rpc("rpc_admin_adjust_credits", {
      p_user_id: j.user_id,
      p_delta: Math.trunc(j.delta),
      p_reason: j.reason ?? "admin",
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST" && action === "refund_credits") {
    const j = await req.json().catch(() => null) as {
      user_id?: string;
      amount?: number;
      reason?: string;
    } | null;
    if (!j?.user_id || typeof j.amount !== "number" || j.amount <= 0) {
      return new Response(JSON.stringify({ error: "user_id_and_positive_amount_required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { data, error } = await admin.rpc("rpc_add_credits", {
      p_user_id: j.user_id,
      p_amount: Math.floor(j.amount),
      p_transaction_type: "admin_refund",
      p_reference_id: "manual_refund",
      p_meta: { reason: j.reason ?? "" },
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(data), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      help: "GET ?action=balance&user_id=… | GET ?action=history&user_id=… | POST ?action=adjust body {user_id,delta,reason} | POST ?action=refund_credits body {user_id,amount,reason}",
    }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
});
