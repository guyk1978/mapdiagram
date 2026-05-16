# Phase 5 — Security Hardening Report

## Security Hardening Summary

| Finding (Phase 2/3) | Mitigation | Status |
|---------------------|------------|--------|
| Project list **`innerHTML`** with user-controlled `p.name` | **DOM API rebuild** (`textContent` for title/meta rows) — no HTML interpolation | Implemented (`renderProjects`) |
| Template picker cards **`innerHTML`** with catalog strings | **`createElement` + `textContent`** per field | Implemented (`flowchart-product.js`) |
| Diagnostics **`escapeHtml`** helper | Available on `MDRuntimeProfiler.escapeHtml` for future callers | Implemented |

## Runtime Guard Inventory

| Guard | Location |
|-------|----------|
| `escapeHtml` | `assets/md-runtime-diagnostics.js` |
| Safe project rows | `app/tool.html` `renderProjects` |

## Reduced Attack Surface Areas

- **Stored XSS via project name** in sidebar list neutralized under normal DOM mutation paths.

## Remaining Critical Risks (Not Addressed — Scope / Safety)

| Risk | Notes |
|------|-------|
| Other `innerHTML` sinks in `tool.html` | Node picker, outlines, command palette — require phased audit |
| **Public diagram payload → renderer** | Needs systematic sanitization policy (Phase 3 contract gap) |
| **postMessage / iframe origin** | Not modified |
| Stripe webhook | Backend change deferred |
