# Phase 2 — Runtime Security Report (Editor Focus)

**Target:** [`app/tool.html`](../../../app/tool.html), [`app/index.html`](../../../app/index.html) (iframe boundary)

---

## 1. Runtime threat model

**Assets:** User diagrams, JWT/session, clipboard contents, localStorage DB blob, AI credits.

**Threat actors:**

- Malicious diagram payload (import / cloud sync / compromised share JSON)
- Malicious browser extension injecting DOM
- Embedded hostile iframe messaging parent (`app/index.html`)
- Malicious project **name** returned from cloud

---

## 2. Attack surface matrix

| Surface | Severity | Confidence | Evidence | Exploit sketch |
|---------|----------|------------|----------|----------------|
| `nodesLayer` / `connectionsLayer` innerHTML wipe + rebuild | Medium | High | ~9994, ~10017 | Supply-chain focuses on **what strings** reach DOM |
| `renderProjects` HTML interpolation | **High** | High | ~9628 `el.innerHTML = \`<div>${p.name}</div>...\`` | Store XSS if project name contains `<img onerror=` |
| Clipboard publish URL | Low | High | ~12715 `navigator.clipboard.writeText` | Social engineering |
| `JSON.parse(loadDB)` | Medium | High | ~5043 | Malicious extension tampering localStorage |
| Theme localStorage | Low | High | ~12888 | Preference tampering |
| Supabase session in SDK storage | Medium | High | client options ~5102–5107 | Physical access |

---

## 3. XSS risk areas

### Project list name injection

```9625:9629:c:\mapdiagram\app\tool.html
    for (const p of runtime.db.projects) {
      const el = document.createElement("div");
      el.className = `project-item${p.projectId === runtime.db.activeProjectId ? " active" : ""}`;
      el.innerHTML = `<div>${p.name}</div><div class="muted">${p.nodes.length} nodes</div><div class="project-actions">...
```

| Finding | Severity | Confidence | Remediation |
|---------|----------|------------|-------------|
| Unescaped `${p.name}` | **Critical** | High | Use `textContent` nodes or `escapeHtml` |

**Reproduction:** Set project name to `<img src=x onerror=alert(1)` via rename prompt (~9632 path) or compromised cloud row → renders HTML when project list paints.

---

### Node picker presets use innerHTML with preset icons

```9678:9683:c:\mapdiagram\app\tool.html
        card.innerHTML = `<div class="preview-node"><div class="node-icon">${preset.icon}</div><div class="preview-label">${preset.label}</div></div>`;
```

| Severity | Confidence | Notes |
|----------|------------|-------|
| Low | High | Data from local `FLOWCHART_MODE_PRESETS` constant — not user-supplied |

---

## 4. postMessage / iframe

Parent shell [`app/index.html`](../../../app/index.html):

```34:36:c:\mapdiagram\app\index.html
    try {
      fr.contentWindow.postMessage({ type: "mapdiagram-theme-sync", mode: m }, "*");
```

Editor **does not** register `window.addEventListener("message")` (Phase 2 grep) — theme crosses via shared `theme-engine` / events instead.

| Finding | Severity | Confidence | Phase 2 note |
|---------|----------|------------|--------------|
| Wildcard targetOrigin | High | High | Already flagged Phase 1 — persists |

---

## 5. Publish / share exposure

```12685:12713:c:\mapdiagram\app\tool.html
  async function publishFlowchart() {
    ...
      const snap = FlowchartProduct.buildSnapshot({ ... });
      const result = await FlowchartProduct.publishToSupabase(..., { title: snap.title, data: snap });
```

| Risk | Severity | Confidence |
|------|----------|------------|
| Oversized / sensitive fields in snapshot | Medium | Low — depends on `FlowchartProduct` implementation (**Not verified** source this phase) |
| Clipboard leaks URL | Low | Medium |

---

## 6. Import / malicious diagram

**Not verified:** `fileInput` import pipeline parsing — Phase 3 requires tracing JSON → `normalizeNode` / graph merge.

---

## 7. Console leakage

```5085:5092:c:\mapdiagram\app\tool.html
    console.info("[App Auth] Config loaded:", {
      urlOk: urlNorm.ok,
      ...
      anonKeyShape: ...
```

| Severity | Confidence |
|----------|------------|
| Medium | High — aids attacker fingerprinting |

---

## 8. Trust boundary diagram

```mermaid
flowchart TB
  subgraph trusted [Trusted_origin_app]
    Editor[tool.html]
    LS[(localStorage)]
  end
  subgraph semi [CDN_umd]
    SupaLib[supabase-js]
  end
  subgraph remote [Supabase_cloud]
    API[PostgREST_Functions]
  end
  Editor --> LS
  Editor --> SupaLib --> API
```

---

## 9. Priority remediations

1. **Eliminate raw HTML interpolation** for project names (Critical).  
2. Audit **all** `innerHTML` assignments with user-derived strings (grep-backed Phase 3 checklist).  
3. Harden parent `postMessage` targetOrigin when hostname known.
