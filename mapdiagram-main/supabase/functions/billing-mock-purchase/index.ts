/**
 * Dev / demo: add fixed credit packs without Stripe.
 * Enable only with ALLOW_MOCK_CREDIT_PURCHASES=1 on the Edge function.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = new Set([10, 50, 100]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (Deno.env.get("ALLOW_MOCK_CREDIT_PURCHASES") !== "1") {
    return new Response(JSON.stringify({ error: "mock_purchases_disabled" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anon, {
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

  let amount = 0;
  try {
    const b = await req.json();
    amount = Math.floor(Number(b?.amount));
  } catch {
    /* */
  }
  if (!ALLOWED.has(amount)) {
    return new Response(JSON.stringify({ error: "invalid_amount", allowed: [10, 50, 100] }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const ref = `mock_${crypto.randomUUID()}`;
  const { data, error } = await admin.rpc("rpc_add_credits", {
    p_user_id: user.id,
    p_amount: amount,
    p_transaction_type: "mock_purchase",
    p_reference_id: ref,
    p_meta: { pack: String(amount) },
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
