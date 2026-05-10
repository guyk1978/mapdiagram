window.MAPDIAGRAM_SUPABASE_URL = "https://kzizxvoajegjsgeyqzmb.supabase.co";
window.MAPDIAGRAM_SUPABASE_ANON_KEY = "sb_publishable_dU_MHTj-0v-dv5DLybk1Sw_3NsXmCFR";
window.MAPDIAGRAM_SUPABASE = {
  url: window.MAPDIAGRAM_SUPABASE_URL || "",
  anonKey: window.MAPDIAGRAM_SUPABASE_ANON_KEY || ""
};
console.log("[Supabase Config] Loaded:", {
  hasUrl: !!window.MAPDIAGRAM_SUPABASE.url,
  hasAnonKey: !!window.MAPDIAGRAM_SUPABASE.anonKey
});