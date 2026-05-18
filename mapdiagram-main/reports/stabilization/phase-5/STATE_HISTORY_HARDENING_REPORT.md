# Phase 5 — State & History Hardening Report

## State Hardening Changes

### SH-1 — `restoreSnapshot` clears flow-group selection

- **Field:** `runtime.selectedFlowGroupId = null` before interaction rebuild.
- **Why:** Prevents stale toolbar/highlights referencing nodes not consistent with undo snapshot (Phase 2 audit).

### SH-2 — Prune `runtime.connectionUi` after undo/redo

- **Logic:** Build `Set` of connection ids from restored `snap.connections`; delete unknown keys from `connectionUi`.
- **Why:** Curve overrides (`connectionUi`) were never snapshotted — pruning avoids phantom CP state pointing at removed edges.

### SH-3 — Profiler `try/finally` around `restoreSnapshot`

- Ensures `markEnd` runs even if future edits throw mid-restore.

## Undo/Redo Stabilization Summary

| Aspect | Status |
|--------|--------|
| Overlay selection consistency | Improved (`selectedFlowGroupId`) |
| Connection CP overrides | Pruned to valid ids |
| Snapshot includes `connectionUi` | Still **no** — intentional size trade-off; prune-on-restore mitigates |

## Mutation Risk Reductions

- **Stale DOM references:** `getNodeDomEl` checks `isConnected` before trusting cache.

## Serialization Safety Improvements

- **`saveDB` try/catch:** Handles `QuotaExceededError` / privacy failures — surfaces toast instead of silent throw (**Persistence report**).

## Verification Notes

- Manual: undo after editing edge curves → restored graph should not reference deleted connection ids in UI behavior.
- Automated full undo simulation — **not added** (would require harness driving `tool.html`).
