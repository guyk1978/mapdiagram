# Group selection reliability

## Symptoms

Intermittent failure to select user groups (edge hits, drag bar, multi-select) especially after **node resize**, **rapid layout changes**, or **zoom** (viewport changes without data migration).

## Investigation notes

- Group hit targets are **`div.group-chrome-hit-edge`** inside `#semantic-overlays` (z-index 6), above `#nodes` (z-index 5). Pointer wiring in `renderSemanticOverlays` calls `applyUserGroupSelection` on `pointerdown`.
- **`getUserGroupBox`** memoizes geometry in **`runtime.groupBoxCache`**. **`computeUserGroupBox`** derives bounds from **`getNodeWorldPosition`** and **`n.width` / `n.height`**.
- **`ResizeObserver`** (per node element) runs **`syncNodeSizes()`**, which updates **`n.width` / `n.height`** from **`el.offsetWidth/offsetHeight`**, then **`scheduleRenderConnections()`** — but it did **not** invalidate **`groupBoxCache`** or **`renderSemanticOverlays()`**.

### Root cause

**Stale `groupBoxCache` + stale group chrome DOM** after node dimension changes: the **visual nodes** updated, **connectors** scheduled a refresh, but **group frames and hit edges** still reflected **old bounds**. Clicks landed in “empty” space or were captured by nodes, so selection felt nondeterministic.

## Stabilization changes

**File:** `app/tool.html` — `ResizeObserver` coalesced callback:

- Set **`runtime.groupBoxCache = null`** after **`syncNodeSizes()`**.
- Call **`renderSemanticOverlays()`** and **`paintMinimap()`** so group chrome and overview stay aligned with updated node metrics.

No change to selection state machine (`applyUserGroupSelection`, `beginGroupDrag`) was required once geometry stayed in sync.

## Remaining edge cases

- **Extreme concurrent stress** (dozens of resize events per frame): coalescing is already RAF-based; if jank persists, a debounced `renderSemanticOverlays` could be considered (out of scope for this sprint).
- **Bugs in `getNodeWorldPosition`** for mixed legacy/group-local coordinate projects would still skew boxes; that is a **data-model** issue, not hit-target drift from cache.

## Regression risks

- Slightly more work on **resize-heavy** sessions (extra overlay + minimap repaint). Bounded by existing ResizeObserver coalescing.

## Rollback

Remove the three added lines in the `ResizeObserver` callback (`groupBoxCache = null`, `renderSemanticOverlays()`, `paintMinimap()`).
