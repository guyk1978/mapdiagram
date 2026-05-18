/**
 * Supabase auth, cloud sync, local persistence, and AI wallet (extracted from tool.html).
 *
 * `createSupabaseRuntime(ctx, deps)` expects:
 * - `ctx.runtime` — shared app state (`db`, `supabase`, `authUser`, timers, caches)
 * - `deps.dom` — UI refs (`savedIndicator`, `authStatus`, `authBtn`, auth modal elements, wallet/modal, …)
 * - `deps.config` — optional `{ dbKey, supabaseUrl, supabaseAnonKey, mdEditCountKey }` (defaults match tool.html)
 * - `deps.blankProject`, `renderAll`, `analyzeDiagramSemantics`, `applyFlowchartOnboardingIfNeeded`
 * - `deps.showToast`, `deps.setRightTab`
 */

/** @type {{ ctx: import("./runtime-context.js").RuntimeContext, deps: Record<string, unknown> } | null} */
let _bound = null;

function bind() {
  if (!_bound) throw new Error("[supabase-runtime] call createSupabaseRuntime(ctx, deps) first");
  return _bound;
}

function getDbKey() {
  const c = bind().deps.config;
  return c?.dbKey ?? "mapdiagram-db-v1";
}

function getSupabaseUrl() {
  const c = bind().deps.config;
  if (c?.supabaseUrl != null) return c.supabaseUrl;
  return window.MAPDIAGRAM_SUPABASE?.url || window.MAPDIAGRAM_SUPABASE_URL || "";
}

function getSupabaseAnonKey() {
  const c = bind().deps.config;
  if (c?.supabaseAnonKey != null) return c.supabaseAnonKey;
  return window.MAPDIAGRAM_SUPABASE?.anonKey || window.MAPDIAGRAM_SUPABASE_ANON_KEY || "";
}

function getMdEditCountKey() {
  const c = bind().deps.config;
  return c?.mdEditCountKey ?? "md-fc-edit-count";
}

/** Display label for signed-in user when email or metadata may be missing. */
function getAuthUserDisplay(user) {
  if (!user) return "Signed in";
  const email = user.email;
  if (typeof email === "string" && email.trim()) return email.trim();
  const meta = user.user_metadata;
  if (meta && typeof meta === "object") {
    const name = meta.full_name || meta.name || meta.user_name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return "Signed in";
}

function setTopbarAuthVisible(el, visible, displayWhenShown = "") {
  if (!el) return;
  if (visible) {
    el.hidden = false;
    el.style.display = displayWhenShown;
    el.removeAttribute("aria-hidden");
  } else {
    el.hidden = true;
    el.style.display = "none";
    el.setAttribute("aria-hidden", "true");
  }
}

function normalizeDbShape() {
  const db = bind().ctx.runtime.db;
  if (!db || typeof db !== "object") {
    bind().ctx.runtime.db = { projects: [], activeProjectId: null, shares: {} };
    return;
  }
  if (!Array.isArray(db.projects)) db.projects = [];
  if (db.shares == null || typeof db.shares !== "object") db.shares = {};
}

export function normalizeSupabaseProjectUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return { ok: false, reason: "empty_url", host: "", baseUrl: "" };
  let u;
  try {
    u = new URL(s);
  } catch (_) {
    return { ok: false, reason: "invalid_url", host: "", baseUrl: "" };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "https_required", host: u.hostname || "", baseUrl: "" };
  if (!u.hostname) return { ok: false, reason: "no_host", host: "", baseUrl: "" };
  return { ok: true, reason: "", host: u.hostname, baseUrl: u.origin };
}

export function loadDB() {
  const raw = localStorage.getItem(getDbKey());
  if (!raw) {
    normalizeDbShape();
    return;
  }
  try {
    bind().ctx.runtime.db = JSON.parse(raw);
  } catch {
    bind().ctx.runtime.db = { projects: [], activeProjectId: null, shares: {} };
  }
  normalizeDbShape();
}

export function saveDB() {
  try {
    localStorage.setItem(getDbKey(), JSON.stringify(bind().ctx.runtime.db));
    bind().deps.dom.savedIndicator.textContent = "Saved";
    bind().deps.dom.savedIndicator.classList.add("ok");
    setTimeout(() => bind().deps.dom.savedIndicator.classList.remove("ok"), 900);
    const prof = window.MDRuntimeProfiler;
    if (prof && prof.perfEnabled()) prof.counterInc("saveDB_ok");
  } catch (err) {
    console.warn("[MapDiagram] saveDB failed", err);
    bind().deps.dom.savedIndicator.textContent = "Save failed";
    bind().deps.dom.savedIndicator.classList.remove("ok");
    bind().deps.showToast(
      "Could not save to browser storage (quota or privacy mode). Export a backup JSON from the Export menu.",
      "warn",
    );
    const prof = window.MDRuntimeProfiler;
    if (prof && prof.perfEnabled()) prof.counterInc("saveDB_err");
  }
}

export function markDirty() {
  saveCanvasState({ debounceMs: 280 });
}

/** Persist active project to localStorage (and optional cloud). */
export function saveCanvasState(opts = {}) {
  const { immediate = false, cloud = true, debounceMs = immediate ? 0 : 280 } = opts;
  const rt = bind().ctx.runtime;
  if (!rt.readOnly) {
    rt.fcEditCount = (rt.fcEditCount || 0) + 1;
    try { localStorage.setItem(getMdEditCountKey(), String(rt.fcEditCount)); } catch (_) {}
    if (rt.generatedAt && rt.fcEditCount === 1 && window.MapDiagramAnalytics) {
      MapDiagramAnalytics.editAfterGenerate({ source: "flowchart" });
    }
  }
  rt.graphCache = null;
  rt.graphCacheKey = "";
  rt.groupBoxCache = null;
  rt.groupBoxCacheProjectId = null;
  const p = getProject();
  if (!p) return false;
  p.updatedAt = Date.now();
  bind().deps.dom.savedIndicator.textContent = immediate ? "Saving..." : "Saving...";
  if (rt.autosaveTimer) clearTimeout(rt.autosaveTimer);
  const flush = () => {
    rt.autosaveTimer = null;
    const proj = getProject();
    if (!proj) return;
    proj.updatedAt = Date.now();
    saveDB();
    if (cloud) scheduleCloudSync();
    scheduleSoftLockPrompt();
  };
  if (debounceMs <= 0) {
    flush();
    return true;
  }
  rt.autosaveTimer = setTimeout(flush, debounceMs);
  return true;
}

/** Load envelope from localStorage and ensure an active project exists. */
export function restoreCanvasStateFromStorage() {
  loadDB();
  ensureBoot();
  return !!getProject();
}

function projectContentScore(project) {
  if (!project) return 0;
  const nodes = Array.isArray(project.nodes) ? project.nodes.length : 0;
  const groups = Array.isArray(project.userGroups) ? project.userGroups.length : 0;
  const conns = Array.isArray(project.connections) ? project.connections.length : 0;
  const gc = Array.isArray(project.groupConnections) ? project.groupConnections.length : 0;
  return nodes * 10 + groups * 5 + conns + gc;
}

/** Prefer newer / richer local edits when cloud rows are stale or empty. */
function mergeDbPreferLocalNewer(prevDb, nextDb) {
  if (!prevDb?.projects?.length || !nextDb?.projects?.length) return nextDb;
  const prevById = new Map(prevDb.projects.map((p) => [p.projectId, p]));
  for (let i = 0; i < nextDb.projects.length; i += 1) {
    const incoming = nextDb.projects[i];
    const local = prevById.get(incoming.projectId);
    if (!local) continue;
    const localScore = projectContentScore(local);
    const incomingScore = projectContentScore(incoming);
    const localTs = Number(local.updatedAt) || 0;
    const incomingTs = Number(incoming.updatedAt) || 0;
    if (localScore > incomingScore + 2 || (localTs > incomingTs + 5000 && localScore >= incomingScore)) {
      nextDb.projects[i] = local;
    }
  }
  const active = nextDb.activeProjectId;
  if (active && !nextDb.projects.some((p) => p.projectId === active)) {
    nextDb.activeProjectId = nextDb.projects[0]?.projectId || null;
  }
  return nextDb;
}

export function initSupabase() {
  if (bind().ctx.runtime.supabaseClientReady && bind().ctx.runtime.supabase) {
    console.info("[App Auth] Supabase client already initialized — single instance kept");
    return;
  }
  const urlNorm = normalizeSupabaseProjectUrl(getSupabaseUrl());
  const keyTrim = String(getSupabaseAnonKey() || "").trim();
  console.info("[App Auth] Config loaded:", {
    urlOk: urlNorm.ok,
    urlReason: urlNorm.reason || undefined,
    host: urlNorm.host || "(none)",
    baseUrlLen: urlNorm.baseUrl ? urlNorm.baseUrl.length : 0,
    anonKeyLen: keyTrim.length,
    anonKeyShape: keyTrim.startsWith("eyJ") ? "jwt" : keyTrim.startsWith("sb_") ? "sb_*" : keyTrim ? "other" : "empty",
    hasLib: !!window.supabase?.createClient,
  });
  if (!window.supabase?.createClient) {
    bind().deps.dom.authStatus.textContent = "Supabase JS library failed to load";
    return;
  }
  if (!urlNorm.ok || !keyTrim) {
    bind().deps.dom.authStatus.textContent = "Supabase not configured (need valid https URL + anon key in supabase-config.js)";
    return;
  }
  bind().ctx.runtime.supabase = window.supabase.createClient(urlNorm.baseUrl, keyTrim, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  bind().ctx.runtime.supabaseMeta = {
    host: urlNorm.host,
    anonKeyLen: keyTrim.length,
    baseUrlLen: urlNorm.baseUrl.length,
  };
  bind().ctx.runtime.supabaseProjectBaseUrl = urlNorm.baseUrl;
  bind().ctx.runtime.supabaseClientReady = true;
  console.info("[App Auth] Supabase client initialized", {
    host: urlNorm.host,
    functionsInvokePath: "/functions/v1/ai-complete (relative to project URL)",
  });
}

export function refreshAuthUi() {
  try {
    const { dom } = bind().deps;
    const { runtime } = bind().ctx;
    const signedIn = !!runtime.authUser;
    const label = signedIn ? getAuthUserDisplay(runtime.authUser) : "";

    if (dom.topbarAuthBar) dom.topbarAuthBar.classList.toggle("is-signed-in", signedIn);

    if (dom.userChip) {
      dom.userChip.textContent = signedIn ? label : "";
      setTopbarAuthVisible(dom.userChip, signedIn, "block");
    }

    if (dom.authBtn) {
      dom.authBtn.textContent = signedIn ? "Logout" : "Login";
      dom.authBtn.setAttribute("aria-label", signedIn ? "Log out of your account" : "Log in or sign up");
      setTopbarAuthVisible(dom.authBtn, true, "inline-flex");
    }

    if (dom.topbarAuthMenuItem) {
      dom.topbarAuthMenuItem.textContent = signedIn ? `Account (${label})` : "Account / Login";
    }

    if (signedIn) {
      if (dom.softLock) dom.softLock.classList.remove("open");
      runtime.softLockShown = true;
    }

    void refreshUserCreditsDisplay();
  } catch (err) {
    console.warn("[App Auth] refreshAuthUi failed:", err);
  }
}

/**
 * Read session from Supabase client, update runtime.authUser, and refresh topbar + wallet UI.
 * Call after sign-in/sign-up and from onAuthStateChange (login can finish before the listener runs).
 */
export async function syncAuthStateFromClient(options = {}) {
  const { loadProjects = true } = options;
  const { runtime } = bind().ctx;
  try {
    if (!runtime.supabase) {
      runtime.authUser = null;
      refreshAuthUi();
      applyAiCreditGatesToUi();
      return;
    }
    const { data, error } = await runtime.supabase.auth.getSession();
    if (error) console.warn("[App Auth] getSession failed:", error);
    runtime.authUser = data?.session?.user ?? null;
    refreshAuthUi();
    applyAiCreditGatesToUi();
    if (loadProjects && runtime.authUser) await loadCloudProjects();
  } catch (err) {
    console.warn("[App Auth] syncAuthStateFromClient failed:", err);
    refreshAuthUi();
    applyAiCreditGatesToUi();
  }
}

export function useMockCreditPurchasesUi() {
  return !!(window.MAPDIAGRAM_AI && window.MAPDIAGRAM_AI.useMockCreditPurchases === true);
}

/** AI is billed only through Supabase + Edge `ai-complete` (no client OpenAI keys). */
export function isServerAiBillingConfigured() {
  return !!bind().ctx.runtime.supabase;
}

export function getAiReservePerStep() {
  return typeof ArchitectureEngine !== "undefined" && Number.isFinite(ArchitectureEngine.BILLING_RESERVE_CREDITS_PER_CALL)
    ? ArchitectureEngine.BILLING_RESERVE_CREDITS_PER_CALL
    : 18;
}

export function applyAiCreditGatesToUi() {
  const serverAi = isServerAiBillingConfigured();
  const reserve = getAiReservePerStep();
  const maxSteps = 3;
  const worstCase = reserve * maxSteps;

  if (bind().deps.dom.aiWalletModeLine) {
    if (!serverAi) {
      bind().deps.dom.aiWalletModeLine.textContent =
        "Add Supabase in assets/supabase-config.js — AI runs only through server credits (no browser API keys).";
    } else if (!bind().ctx.runtime.authUser) {
      bind().deps.dom.aiWalletModeLine.textContent = "Log in to see your balance and run billed AI.";
    } else if (bind().ctx.runtime.aiCredits === null) {
      bind().deps.dom.aiWalletModeLine.textContent = "Loading wallet…";
    } else {
      bind().deps.dom.aiWalletModeLine.textContent = "Signed in — balance is stored on the server.";
    }
  }

  if (bind().deps.dom.aiWalletBalanceBig) {
    if (!serverAi || !bind().ctx.runtime.authUser) {
      bind().deps.dom.aiWalletBalanceBig.textContent = "—";
      bind().deps.dom.aiWalletBalanceBig.classList.add("muted-balance");
    } else if (bind().ctx.runtime.aiCredits === null) {
      bind().deps.dom.aiWalletBalanceBig.textContent = "…";
      bind().deps.dom.aiWalletBalanceBig.classList.add("muted-balance");
    } else {
      bind().deps.dom.aiWalletBalanceBig.textContent = String(bind().ctx.runtime.aiCredits);
      bind().deps.dom.aiWalletBalanceBig.classList.remove("muted-balance");
    }
  }

  if (bind().deps.dom.aiWalletCostLine) {
    if (!serverAi) {
      bind().deps.dom.aiWalletCostLine.textContent = "";
    } else {
      bind().deps.dom.aiWalletCostLine.textContent = `One diagram compile uses up to ${maxSteps} server steps. Each step reserves up to ${reserve} credits first, then charges based on tokens (min 1) and refunds the rest. Worst case ≈ ${worstCase} credits if every attempt runs.`;
    }
  }

  const canBill = serverAi && bind().ctx.runtime.authUser;
  const bal = bind().ctx.runtime.aiCredits;
  const enough = canBill && bal !== null && Number.isFinite(bal) && bal >= reserve;
  const loadingWallet = canBill && bind().ctx.runtime.aiCredits === null;

  if (bind().deps.dom.aiWalletInsufficient) {
    if (!serverAi) {
      bind().deps.dom.aiWalletInsufficient.textContent = "Configure Supabase to enable credit-backed AI.";
      bind().deps.dom.aiWalletInsufficient.classList.add("show");
    } else if (!bind().ctx.runtime.authUser) {
      bind().deps.dom.aiWalletInsufficient.textContent = "Log in to use AI credits (or buy packs below once signed in).";
      bind().deps.dom.aiWalletInsufficient.classList.add("show");
    } else if (
      bind().ctx.runtime.aiCredits !== null &&
      (!Number.isFinite(bind().ctx.runtime.aiCredits) || bind().ctx.runtime.aiCredits <= 0 || bind().ctx.runtime.aiCredits < reserve)
    ) {
      bind().deps.dom.aiWalletInsufficient.textContent = `Insufficient credits (need at least ${reserve} per step). Buy credits below.`;
      bind().deps.dom.aiWalletInsufficient.classList.add("show");
    } else {
      bind().deps.dom.aiWalletInsufficient.classList.remove("show");
      bind().deps.dom.aiWalletInsufficient.textContent = "";
    }
  }

  const gateDisabled = !serverAi || !bind().ctx.runtime.authUser || loadingWallet || !enough;
  if (bind().deps.dom.generateAiWalletBtn) {
    bind().deps.dom.generateAiWalletBtn.disabled = gateDisabled;
    bind().deps.dom.generateAiWalletBtn.title = gateDisabled
      ? !serverAi
        ? "Configure Supabase for AI"
        : !bind().ctx.runtime.authUser
          ? "Log in to use AI"
          : loadingWallet
            ? "Loading balance…"
            : `Need at least ${reserve} credits`
      : `Opens the AI prompt (costs up to ${reserve} credits per compile step)`;
  }
  if (bind().deps.dom.createAiBtn) {
    bind().deps.dom.createAiBtn.disabled = gateDisabled;
    bind().deps.dom.createAiBtn.title = gateDisabled ? bind().deps.dom.generateAiWalletBtn?.title || "" : "Generate a flowchart from a text prompt";
  }
  if (bind().deps.dom.aiGenerateBtn && bind().deps.dom.aiGenerateBtn.textContent !== "Compiling...") {
    bind().deps.dom.aiGenerateBtn.disabled = gateDisabled;
  }

  if (bind().deps.dom.userCreditBadge) {
    if (!serverAi || !bind().ctx.runtime.authUser || bind().ctx.runtime.aiCredits === null) {
      bind().deps.dom.userCreditBadge.style.display = "none";
    } else {
      bind().deps.dom.userCreditBadge.textContent = `· AI credits: ${bind().ctx.runtime.aiCredits}`;
      bind().deps.dom.userCreditBadge.style.display = "inline";
    }
  }
  if (bind().deps.dom.aiCreditInline && serverAi && bind().ctx.runtime.authUser && bind().ctx.runtime.aiCredits !== null) {
    bind().deps.dom.aiCreditInline.textContent = `Balance: ${bind().ctx.runtime.aiCredits} credits. Each step reserves up to ${reserve}, then refunds unused tokens.`;
  }
  if (bind().deps.dom.aiBillingRow) {
    bind().deps.dom.aiBillingRow.style.display = serverAi && bind().ctx.runtime.authUser ? "block" : "none";
  }

  if (bind().deps.dom.aiWalletMockRow) {
    bind().deps.dom.aiWalletMockRow.style.display = serverAi && useMockCreditPurchasesUi() ? "flex" : "none";
  }

  if (bind().deps.dom.aiModalIntro) {
    bind().deps.dom.aiModalIntro.innerHTML =
      'The model returns a strict <strong>ArchitectureSpec</strong> (JSON only). The <strong>server</strong> reserves credits before each OpenAI call.';
  }
  if (bind().deps.dom.aiCostHint) {
    if (serverAi) {
      bind().deps.dom.aiCostHint.style.display = "block";
      bind().deps.dom.aiCostHint.innerHTML =
        `<strong>Cost</strong>: up to <strong>${reserve}</strong> credits reserved <em>per compile attempt</em> (validator may retry up to ${maxSteps} times). You are charged from that reserve based on tokens (minimum 1); the remainder is <strong>refunded</strong> automatically.`;
    } else {
      bind().deps.dom.aiCostHint.style.display = "none";
    }
  }
  if (bind().deps.dom.aiModalCostInline) {
    if (serverAi && bind().ctx.runtime.authUser && bind().ctx.runtime.aiCredits !== null) {
      bind().deps.dom.aiModalCostInline.style.display = "inline";
      bind().deps.dom.aiModalCostInline.textContent = `Balance: ${bind().ctx.runtime.aiCredits} · need ≥${reserve}/step`;
    } else {
      bind().deps.dom.aiModalCostInline.style.display = "none";
    }
  }
}

export async function syncAiWalletFromBackend() {
  if (!bind().ctx.runtime.supabase || !bind().ctx.runtime.authUser) {
    bind().ctx.runtime.aiCredits = null;
    applyAiCreditGatesToUi();
    return;
  }
  const { data, error } = await bind().ctx.runtime.supabase
    .from("user_wallets")
    .select("credits")
    .eq("user_id", bind().ctx.runtime.authUser.id)
    .maybeSingle();
  if (error || !data) {
    bind().ctx.runtime.aiCredits = null;
  } else {
    const n = typeof data.credits === "number" ? data.credits : Number(data.credits);
    bind().ctx.runtime.aiCredits = Number.isFinite(n) ? n : null;
  }
  applyAiCreditGatesToUi();
}

export async function refreshUserCreditsDisplay() {
  await syncAiWalletFromBackend();
}

export async function openAiModalIfAllowed() {
  if (!bind().ctx.runtime.supabase) {
    bind().deps.setRightTab("ai");
    applyAiCreditGatesToUi();
    bind().deps.dom.savedIndicator.textContent = "Configure Supabase for AI billing";
    setTimeout(() => (bind().deps.dom.savedIndicator.textContent = "Saved"), 2200);
    return;
  }
  if (!bind().ctx.runtime.authUser) {
    bind().deps.setRightTab("ai");
    applyAiCreditGatesToUi();
    bind().deps.dom.savedIndicator.textContent = "Log in to use AI credits";
    setTimeout(() => (bind().deps.dom.savedIndicator.textContent = "Saved"), 2200);
    return;
  }
  await syncAiWalletFromBackend();
  const reserve = getAiReservePerStep();
  if (
    bind().ctx.runtime.aiCredits !== null &&
    (!Number.isFinite(bind().ctx.runtime.aiCredits) || bind().ctx.runtime.aiCredits <= 0 || bind().ctx.runtime.aiCredits < reserve)
  ) {
    bind().deps.setRightTab("ai");
    applyAiCreditGatesToUi();
    bind().deps.dom.aiStatus.textContent = `Insufficient credits (need at least ${reserve} per step).`;
    bind().deps.dom.savedIndicator.textContent = "Insufficient credits — open AI tab to buy";
    setTimeout(() => (bind().deps.dom.savedIndicator.textContent = "Saved"), 2600);
    return;
  }
  bind().deps.dom.aiModalOverlay.classList.add("open");
  bind().deps.dom.aiPromptInput.focus();
  bind().deps.dom.aiStatus.textContent = "";
  applyAiCreditGatesToUi();
}

export async function startCreditPackCheckout(pack) {
  if (!bind().ctx.runtime.supabase || !bind().ctx.runtime.authUser) {
    alert("Log in first to buy credits.");
    return;
  }
  const { data, error } = await bind().ctx.runtime.supabase.functions.invoke("billing-checkout", {
    body: { pack },
  });
  if (error || !data?.url) {
    alert(error?.message || data?.error || "Checkout unavailable. Deploy billing-checkout and set STRIPE_SECRET_KEY.");
    return;
  }
  window.open(data.url, "_blank", "noopener,noreferrer");
}

export async function startMockCreditPurchase(amount) {
  if (!bind().ctx.runtime.supabase || !bind().ctx.runtime.authUser) {
    alert("Log in first.");
    return;
  }
  const { data, error } = await bind().ctx.runtime.supabase.functions.invoke("billing-mock-purchase", {
    body: { amount },
  });
  if (error || data?.error) {
    alert(
      error?.message ||
        data?.error ||
        "Mock purchase failed. Set Edge secret ALLOW_MOCK_CREDIT_PURCHASES=1 and deploy billing-mock-purchase."
    );
    return;
  }
  await syncAiWalletFromBackend();
  bind().deps.dom.savedIndicator.textContent = `+${amount} credits (mock)`;
  setTimeout(() => (bind().deps.dom.savedIndicator.textContent = "Saved"), 1400);
}

function authRedirectUrl() {
  const base = window.location.origin;
  return `${base}/auth/callback/`;
}

function isPasswordRecoveryUrl() {
  const hash = (window.location.hash || "").replace(/^#/, "");
  if (!hash) return false;
  try {
    return new URLSearchParams(hash).get("type") === "recovery";
  } catch (_) {
    return false;
  }
}

export function clearRecoveryHashFromUrl() {
  if (!window.location.hash) return;
  const clean = window.location.pathname + window.location.search;
  history.replaceState(null, "", clean);
}

function applyAuthModalMode() {
  const { dom } = bind().deps;
  const mode = bind().ctx.runtime.authModalMode || "login";
  const forgot = mode === "forgot";
  const updatePw = mode === "update-password";
  const loginLike = !forgot && !updatePw;

  if (dom.authEmailRow) dom.authEmailRow.hidden = updatePw;
  if (dom.authPasswordRow) dom.authPasswordRow.hidden = forgot || updatePw;
  if (dom.authUpdatePasswordRow) dom.authUpdatePasswordRow.hidden = !updatePw;
  if (dom.authPassword) dom.authPassword.disabled = forgot || updatePw;
  if (dom.authNewPassword) dom.authNewPassword.disabled = !updatePw;
  if (dom.signupSubmitBtn) dom.signupSubmitBtn.hidden = !loginLike;
  if (dom.authGoogleBtn) dom.authGoogleBtn.hidden = !loginLike;
  if (dom.authDivider) dom.authDivider.hidden = !loginLike;
  if (dom.authForgotPasswordRow) dom.authForgotPasswordRow.hidden = !loginLike;
  if (dom.authForgotPasswordBtn) dom.authForgotPasswordBtn.hidden = !loginLike;
  if (dom.authBackToLoginBtn) dom.authBackToLoginBtn.hidden = !forgot;

  if (dom.authForgotHint) {
    dom.authForgotHint.hidden = !(forgot || updatePw);
    if (forgot) {
      dom.authForgotHint.textContent =
        "Enter the email for your account. We will send a link to reset your password.";
    } else if (updatePw) {
      dom.authForgotHint.textContent = "Enter a new password for your account, then save to continue.";
    }
  }

  if (dom.loginSubmitBtn) {
    dom.loginSubmitBtn.textContent = updatePw ? "Save New Password" : forgot ? "Send reset link" : "Login";
    dom.loginSubmitBtn.setAttribute(
      "aria-label",
      updatePw ? "Save new password" : forgot ? "Send password reset email" : "Submit login",
    );
  }
  if (dom.authModalTitle) {
    dom.authModalTitle.textContent = updatePw ? "Set new password" : forgot ? "Reset password" : "Account";
  }
}

export function openAuthModalForPasswordUpdate() {
  const { dom } = bind().deps;
  bind().ctx.runtime.authModalMode = "update-password";
  applyAuthModalMode();
  dom.authStatus.textContent = "";
  if (dom.authNewPassword) dom.authNewPassword.value = "";
  dom.authOverlay.classList.add("open");
  dom.authNewPassword?.focus();
}

export function openAuthModal() {
  const { dom } = bind().deps;
  bind().ctx.runtime.authModalMode = "login";
  applyAuthModalMode();
  dom.authStatus.textContent = bind().ctx.runtime.supabase
    ? ""
    : "Supabase is not configured. Set values in /assets/supabase-config.js";
  dom.authOverlay.classList.add("open");
}

export function closeAuthModal() {
  bind().ctx.runtime.authModalMode = "login";
  applyAuthModalMode();
  bind().deps.dom.authOverlay.classList.remove("open");
}

/** Toggle password field visibility (eye icon). */
export function togglePasswordVisibility(inputId) {
  const { dom } = bind().deps;
  const input =
    inputId === "authPassword"
      ? dom.authPassword
      : inputId === "authNewPassword"
        ? dom.authNewPassword
        : document.getElementById(inputId);
  const toggleBtn =
    inputId === "authPassword"
      ? dom.authPasswordToggle
      : inputId === "authNewPassword"
        ? dom.authNewPasswordToggle
        : document.querySelector(`.auth-password-toggle[data-password-target="${inputId}"]`);
  if (!input) return;
  const reveal = input.type === "password";
  input.type = reveal ? "text" : "password";
  if (toggleBtn) {
    toggleBtn.classList.toggle("is-visible", reveal);
    toggleBtn.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    toggleBtn.setAttribute("aria-pressed", reveal ? "true" : "false");
  }
}

export function handleForgotPasswordClick() {
  const { dom } = bind().deps;
  bind().ctx.runtime.authModalMode = "forgot";
  applyAuthModalMode();
  dom.authStatus.textContent = "";
  if (dom.authForgotHint) {
    dom.authForgotHint.textContent =
      "Enter the email for your account. We will send a link to reset your password.";
  }
  dom.authEmail?.focus();
}

export function handleBackToLoginClick() {
  const { dom } = bind().deps;
  bind().ctx.runtime.authModalMode = "login";
  applyAuthModalMode();
  dom.authStatus.textContent = "";
}

export async function handleGoogleSignIn() {
  const { ctx, deps } = bind();
  const { runtime } = ctx;
  const { dom } = deps;
  if (!runtime.supabase) {
    dom.authStatus.textContent = "Supabase is not configured.";
    deps.showToast?.("Configure Supabase to sign in with Google.", "warn");
    return;
  }
  dom.authStatus.textContent = "Redirecting to Google…";
  const { error } = await runtime.supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    dom.authStatus.textContent = error.message;
    deps.showToast?.(error.message, "warn");
  }
}

export async function handlePasswordResetSubmit() {
  const { ctx, deps } = bind();
  const { runtime } = ctx;
  const { dom } = deps;
  if (!runtime.supabase) return;
  const email = dom.authEmail?.value?.trim() || "";
  if (!email) {
    dom.authStatus.textContent = "Enter your email address.";
    return;
  }
  dom.authStatus.textContent = "Sending reset email…";
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await runtime.supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    dom.authStatus.textContent = error.message;
    deps.showToast?.(error.message, "warn");
    return;
  }
  deps.showToast?.("Password reset email sent. Check your inbox.", "info");
  dom.authStatus.textContent = "Check your email for a password reset link.";
  bind().ctx.runtime.authModalMode = "login";
  applyAuthModalMode();
}

export async function loadCloudProjects() {
  if (!bind().ctx.runtime.supabase || !bind().ctx.runtime.authUser) return;
  let data;
  let error;
  try {
    ({ data, error } = await bind().ctx.runtime.supabase
      .from("projects")
      .select("id,name,data,updated_at")
      .order("updated_at", { ascending: false }));
  } catch (err) {
    console.warn("[App Auth] loadCloudProjects request failed:", err);
    return;
  }
  if (error) {
    console.warn("[App Auth] loadCloudProjects:", error.message);
    if (bind().deps.dom.authStatus) bind().deps.dom.authStatus.textContent = error.message;
    return;
  }
  try {
  const prevDb = JSON.parse(JSON.stringify(bind().ctx.runtime.db));
  bind().ctx.runtime.db.projects = (data || []).map((row) => ({
    projectId: row.id,
    name: row.name || "Untitled",
    title: row.data?.title || "Blank Canvas",
    nodes: Array.isArray(row.data?.nodes) ? row.data.nodes : [],
    connections: Array.isArray(row.data?.connections) ? row.data.connections : [],
    userGroups: Array.isArray(row.data?.userGroups) ? row.data.userGroups : [],
    groupConnections: Array.isArray(row.data?.groupConnections) ? row.data.groupConnections : [],
    flowGroups: Array.isArray(row.data?.flowGroups) ? row.data.flowGroups : [],
    view: row.data?.view || { x: 0, y: 0, zoom: 1 },
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
  }));
  bind().ctx.runtime.db = mergeDbPreferLocalNewer(prevDb, bind().ctx.runtime.db);
  if (!bind().ctx.runtime.db.projects.length) {
    const p = bind().deps.blankProject("My First Diagram");
    bind().ctx.runtime.db.projects = [p];
    bind().ctx.runtime.db.activeProjectId = p.projectId;
    saveDB();
    await cloudSyncProject(p);
  } else if (!bind().ctx.runtime.db.projects.some((p) => p.projectId === bind().ctx.runtime.db.activeProjectId)) {
    bind().ctx.runtime.db.activeProjectId = bind().ctx.runtime.db.projects[0].projectId;
  }
  saveDB();
  bind().deps.renderAll();
  bind().deps.analyzeDiagramSemantics();
  void syncAiWalletFromBackend();
  } catch (err) {
    console.warn("[App Auth] loadCloudProjects parse failed:", err);
  }
}

export async function cloudSyncProject(project) {
  if (!bind().ctx.runtime.supabase || !bind().ctx.runtime.authUser || !project) return;
  const payload = {
    id: project.projectId,
    user_id: bind().ctx.runtime.authUser.id,
    name: project.name,
    data: {
      title: project.title,
      nodes: project.nodes,
      connections: project.connections,
      userGroups: project.userGroups || [],
      groupConnections: project.groupConnections || [],
      flowGroups: project.flowGroups || [],
      view: project.view
    },
    updated_at: new Date().toISOString()
  };
  const { data, error } = await bind().ctx.runtime.supabase.from("projects").upsert(payload).select("id").single();
  if (error) {
    bind().deps.dom.savedIndicator.textContent = "Cloud save failed";
    return;
  }
  if (data?.id && data.id !== project.projectId) {
    project.projectId = data.id;
    bind().ctx.runtime.db.activeProjectId = project.projectId;
  }
}

export function scheduleCloudSync() {
  if (!bind().ctx.runtime.authUser) return;
  if (bind().ctx.runtime.cloudSyncTimer) clearTimeout(bind().ctx.runtime.cloudSyncTimer);
  bind().ctx.runtime.cloudSyncTimer = setTimeout(async () => {
    const p = getProject();
    if (!p) return;
    await cloudSyncProject(p);
    bind().deps.dom.savedIndicator.textContent = "Saved (cloud)";
  }, 600);
}

export async function bootstrapAuth() {
  const { runtime } = bind().ctx;
  try {
  if (!runtime.supabase) {
    refreshAuthUi();
    return;
  }
  await syncAuthStateFromClient({ loadProjects: !isPasswordRecoveryUrl() });
  refreshAuthUi();
  console.log("[App Auth] bootstrap session:", runtime.authUser?.email || null);
  if (isPasswordRecoveryUrl()) {
    openAuthModalForPasswordUpdate();
  }
  if (runtime._authStateListenerRegistered) return;
  runtime._authStateListenerRegistered = true;
  runtime.supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("[App Auth] Auth state changed:", event, session?.user?.email || null);
    if (event === "PASSWORD_RECOVERY") {
      runtime.authUser = session?.user ?? null;
      clearRecoveryHashFromUrl();
      refreshAuthUi();
      applyAiCreditGatesToUi();
      openAuthModalForPasswordUpdate();
      return;
    }
    runtime.authUser = session?.user ?? null;
    refreshAuthUi();
    applyAiCreditGatesToUi();
    if (runtime.authUser) {
      await loadCloudProjects();
    } else {
      loadDB();
      ensureBoot();
      bind().deps.renderAll();
      bind().deps.analyzeDiagramSemantics();
    }
  });
  } catch (err) {
    console.warn("[App Auth] bootstrapAuth failed:", err);
    refreshAuthUi();
    applyAiCreditGatesToUi();
  }
}

export function getProject() {
  return bind().ctx.runtime.db.projects.find((p) => p.projectId === bind().ctx.runtime.db.activeProjectId);
}

export function ensureBoot() {
  loadDB();
  if (!bind().ctx.runtime.db.projects.length) {
    const p = bind().deps.blankProject("My First Flowchart");
    bind().ctx.runtime.db.projects.push(p);
    bind().ctx.runtime.db.activeProjectId = p.projectId;
    saveDB();
  }
  if (!bind().ctx.runtime.db.activeProjectId) bind().ctx.runtime.db.activeProjectId = bind().ctx.runtime.db.projects[0].projectId;
  bind().deps.applyFlowchartOnboardingIfNeeded();
}

export function scheduleSoftLockPrompt() {
  if (bind().ctx.runtime.authUser || bind().ctx.runtime.softLockShown) return;
  if (bind().ctx.runtime.softLockTimer) clearTimeout(bind().ctx.runtime.softLockTimer);
  bind().ctx.runtime.softLockTimer = setTimeout(() => {
    if (!bind().ctx.runtime.authUser && !bind().ctx.runtime.softLockShown) {
      bind().deps.dom.softLock.classList.add("open");
    }
  }, 120000);
}


export async function handleAuthButtonClick() {
  const { ctx, deps } = bind();
  const { runtime } = ctx;
  if (runtime.authUser) {
    if (runtime.supabase) await runtime.supabase.auth.signOut();
    await syncAuthStateFromClient({ loadProjects: false });
    return;
  }
  if (!runtime.supabase) {
    window.location.href = "/auth/";
    return;
  }
  openAuthModal();
}

export function handleSoftLockLoginClick() {
  const { ctx, deps } = bind();
  const { runtime } = ctx;
  const { dom } = deps;
  runtime.softLockShown = true;
  dom.softLock.classList.remove("open");
  if (!runtime.supabase) {
    window.location.href = "/auth/";
    return;
  }
  openAuthModal();
}

export function handleSoftLockLaterClick() {
  const { ctx, deps } = bind();
  const { runtime } = ctx;
  const { dom } = deps;
  runtime.softLockShown = true;
  dom.softLock.classList.remove("open");
}

export async function handleUpdatePasswordSubmit() {
  const { ctx, deps } = bind();
  const { runtime } = ctx;
  const { dom } = deps;
  if (!runtime.supabase) return;
  const password = String(dom.authNewPassword?.value || "").trim();
  if (password.length < 6) {
    dom.authStatus.textContent = "Enter a password with at least 6 characters.";
    return;
  }
  dom.authStatus.textContent = "Updating password…";
  const { error } = await runtime.supabase.auth.updateUser({ password });
  if (error) {
    dom.authStatus.textContent = error.message;
    deps.showToast?.(error.message, "warn");
    return;
  }
  deps.showToast?.("Password updated successfully!", "info");
  clearRecoveryHashFromUrl();
  bind().ctx.runtime.authModalMode = "login";
  applyAuthModalMode();
  if (dom.authNewPassword) dom.authNewPassword.value = "";
  await syncAuthStateFromClient();
  dom.authStatus.textContent = "Signed in";
  closeAuthModal();
}

export async function handleLoginSubmit() {
  const { ctx, deps } = bind();
  const { runtime } = ctx;
  const { dom } = deps;
  if (!runtime.supabase) return;
  if (runtime.authModalMode === "update-password") {
    await handleUpdatePasswordSubmit();
    return;
  }
  if (runtime.authModalMode === "forgot") {
    await handlePasswordResetSubmit();
    return;
  }
  dom.authStatus.textContent = "Signing in...";
  console.log("[App Auth] Login click");
  const { data, error } = await runtime.supabase.auth.signInWithPassword({
    email: dom.authEmail.value.trim(),
    password: dom.authPassword.value,
  });
  console.log("[App Auth] signInWithPassword response:", { error, user: data?.user?.email || null });
  if (error) {
    dom.authStatus.textContent = error.message;
    return;
  }
  runtime.authUser = data?.user ?? data?.session?.user ?? null;
  await syncAuthStateFromClient();
  dom.authStatus.textContent = "Signed in";
  closeAuthModal();
}

export async function handleSignupSubmit() {
  const { ctx, deps } = bind();
  const { runtime } = ctx;
  const { dom } = deps;
  if (!runtime.supabase) return;
  dom.authStatus.textContent = "Creating account...";
  console.log("[App Auth] Sign up click");
  const { data, error } = await runtime.supabase.auth.signUp({
    email: dom.authEmail.value.trim(),
    password: dom.authPassword.value,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback/` },
  });
  console.log("[App Auth] signUp response:", { error, user: data?.user?.email || null, hasSession: !!data?.session });
  if (error) {
    dom.authStatus.textContent = error.message;
    return;
  }
  if (data?.session?.user || data?.user) {
    runtime.authUser = data.session?.user ?? data.user ?? null;
    await syncAuthStateFromClient();
    dom.authStatus.textContent = "Signed in";
    closeAuthModal();
    return;
  }
  dom.authStatus.textContent = "Check your email to confirm sign up.";
}

/** Session + project URL for FlowchartCompiler billing gateway (Edge ai-complete). */
export async function getBillingGatewayAuth() {
  const { ctx } = bind();
  const { runtime } = ctx;
  if (!runtime.supabase) return null;
  const { data: sessData } = await runtime.supabase.auth.getSession();
  const gatewayAccessToken = sessData?.session?.access_token || "";
  if (!gatewayAccessToken) return null;
  const keyTrim = String(getSupabaseAnonKey() || "").trim();
  const urlSnap = normalizeSupabaseProjectUrl(getSupabaseUrl());
  const projectBase = runtime.supabaseProjectBaseUrl || (urlSnap.ok ? urlSnap.baseUrl : "");
  return { projectBaseUrl: projectBase, supabaseAnonKey: keyTrim, accessToken: gatewayAccessToken };
}

const supabaseApi = {
  normalizeSupabaseProjectUrl,
  loadDB,
  saveDB,
  markDirty,
  saveCanvasState,
  restoreCanvasStateFromStorage,
  initSupabase,
  refreshAuthUi,
  useMockCreditPurchasesUi,
  isServerAiBillingConfigured,
  getAiReservePerStep,
  applyAiCreditGatesToUi,
  syncAiWalletFromBackend,
  refreshUserCreditsDisplay,
  openAiModalIfAllowed,
  startCreditPackCheckout,
  startMockCreditPurchase,
  openAuthModal,
  openAuthModalForPasswordUpdate,
  closeAuthModal,
  clearRecoveryHashFromUrl,
  togglePasswordVisibility,
  handleForgotPasswordClick,
  handleBackToLoginClick,
  handleGoogleSignIn,
  handlePasswordResetSubmit,
  handleUpdatePasswordSubmit,
  loadCloudProjects,
  cloudSyncProject,
  scheduleCloudSync,
  bootstrapAuth,
  syncAuthStateFromClient,
  getProject,
  ensureBoot,
  scheduleSoftLockPrompt,
  handleAuthButtonClick,
  handleSoftLockLoginClick,
  handleSoftLockLaterClick,
  handleLoginSubmit,
  handleSignupSubmit,
  getBillingGatewayAuth,
};

export function createSupabaseRuntime(ctx, deps) {
  _bound = { ctx, deps };
  return supabaseApi;
}
