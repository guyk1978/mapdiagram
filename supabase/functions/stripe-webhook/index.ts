/**
 * Stripe checkout.session.completed → credits via metadata (user_id, credits, pack).
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY
 * Local mock: MOCK_STRIPE=1 + POST raw JSON body (no signature).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response("method_not_allowed", { status: 405, headers: cors });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const mock = Deno.env.get("MOCK_STRIPE") === "1";
  const rawBody = await req.text();

  let event: { id: string; type: string; data: { object: Record<string, unknown> } };

  if (mock) {
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "bad_json" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  } else {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const sig = req.headers.get("stripe-signature") ?? "";
    if (!webhookSecret || !stripeKey) {
      return new Response(JSON.stringify({ error: "stripe_not_configured" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    try {
      const Stripe = (await import("https://esm.sh/stripe@14.21.0?target=deno")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret) as typeof event;
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: "signature_invalid" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  await handleStripeEvent(event, supabaseUrl, serviceKey);

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

async function handleStripeEvent(
  event: { id: string; type: string; data: { object: Record<string, unknown> } },
  supabaseUrl: string,
  serviceKey: string,
) {
  const admin = createClient(supabaseUrl, serviceKey);
  const eventId = String(event.id);

  const { data: dup } = await admin.from("stripe_processed_events").select("id").eq("id", eventId).maybeSingle();
  if (dup) return;

  if (event.type !== "checkout.session.completed") {
    await admin.from("stripe_processed_events").insert({ id: eventId });
    return;
  }

  const obj = event.data.object as {
    id?: string;
    metadata?: { user_id?: string; credits?: string; pack?: string };
  };
  const userId = obj.metadata?.user_id;
  const creditsRaw = Number(obj.metadata?.credits ?? 0);
  const MAX_CREDITS_PER_PURCHASE = 1_000_000;
  const credits = Math.min(Math.floor(creditsRaw), MAX_CREDITS_PER_PURCHASE);
  if (creditsRaw > MAX_CREDITS_PER_PURCHASE) {
    console.warn("checkout.session.completed credits clamped", { session: obj.id, creditsRaw, credits });
  }
  if (!userId || !Number.isFinite(creditsRaw) || credits <= 0) {
    console.warn("checkout.session.completed missing user_id/credits", obj.id);
    await admin.from("stripe_processed_events").insert({ id: eventId });
    return;
  }

  const { error } = await admin.rpc("rpc_add_credits", {
    p_user_id: userId,
    p_amount: credits,
    p_transaction_type: "stripe_purchase",
    p_reference_id: String(obj.id ?? eventId),
    p_meta: { pack: obj.metadata?.pack ?? "unknown", stripe_event: eventId },
  });
  if (error) {
    console.error("rpc_add_credits", error);
    return;
  }
  await admin.from("stripe_processed_events").insert({ id: eventId });
}
