// Copy to ai-config.js. AI calls always go through Supabase Edge `ai-complete` (credits reserved server-side).
window.MAPDIAGRAM_AI = {
  model: "gpt-4o-mini",
  // Optional dev helper: server-side mock purchase (not Stripe). Edge must allow ALLOW_MOCK_CREDIT_PURCHASES=1.
  useMockCreditPurchases: false,
};
