/**
 * Creates a Stripe Checkout session for credit packs (Starter / Pro / Power).
 * Env: STRIPE_SECRET_KEY, FRONTEND_SUCCESS_URL, FRONTEND_CANCEL_URL
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PACKS: Record<string, { credits: number; amountCents: number; label: string }> = {
  starter: { credits: 500, amountCents: 499, label: "Starter" },
  pro: { credits: 5000, amountCents: 2499, label: "Pro" },
  power: { credits: 25000, amountCents: 9999, label: "Power" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const successUrl = Deno.env.get("FRONTEND_SUCCESS_URL") ?? "https://example.com/?billing=success";
  const cancelUrl = Deno.env.get("FRONTEND_CANCEL_URL") ?? "https://example.com/?billing=cancel";

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "stripe_not_configured" }), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

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

  let pack = "starter";
  try {
    const b = await req.json();
    if (b && typeof b.pack === "string" && PACKS[b.pack]) pack = b.pack;
  } catch {
    /* default */
  }
  const p = PACKS[pack];

  const Stripe = (await import("https://esm.sh/stripe@14.21.0?target=deno")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      credits: String(p.credits),
      pack,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: p.amountCents,
          product_data: {
            name: `MapDiagram AI credits — ${p.label}`,
            description: `${p.credits} credits`,
          },
        },
      },
    ],
  });

  return new Response(JSON.stringify({ url: session.url, id: session.id }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
