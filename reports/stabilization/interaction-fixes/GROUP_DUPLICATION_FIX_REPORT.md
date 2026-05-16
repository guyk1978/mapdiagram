# Group duplication integrity (`duplicateUserGroup`)

## Corruption symptoms (observed / inferred)

- Duplicated groups **overlapping** originals or **losing** branch layout: often from **missing duplicated edges**.
- **Stale selection** pointing at **old node or connection IDs** after duplicate: inspector / multi-select / connection UI referencing removed graph members.

## Root cause analysis

### 1. Missing `branch-from` connections

`duplicateUserGroup` duplicated **`isNodeNodeConnection`** (unqualified or `node-node`) and **node–group / group–node** bridges, but **`kind: "branch-from"`** edges were **never copied**.

Branch edges reference:

- `parentConnectionId` → a **parent node–node** connection.
- `to` → target node.

After duplicate, old branch rows still pointed at **old parent connection ids** and **old node ids**, while the renderer’s branch pass **skips** invalid parents (`renderConnections` requires a resolvable `parent` and `toNode`). Result: **missing or broken** branch lines and **visual “corruption”** next to intact main edges.

### 2. Selection not fully reset

After duplicate, **group** selection was aimed at the **new root**, but **node selection** and **edge selection** could still reference **pre-duplicate ids**, desynchronizing UI (`renderSelection`, connection list, inspectors).

## Hardening fixes

**File:** `app/tool.html` — `duplicateUserGroup`

1. **`connIdMap`:** While duplicating fully internal **node–node** connections, map **`oldConnectionId → newConnectionId`**.
2. **Second pass over the pre-duplicate snapshot:** For each **`branch-from`** edge whose **`to`** is in the duplicated node set and whose **parent** was duplicated, push a **`deepCopy`** with:
   - new `id` (`uid()`),
   - `parentConnectionId` remapped via `connIdMap`,
   - `to` remapped via `nodeMap`,
   - `normalizeConnectionEdge(nc)`.
3. **Selection cleanup before `renderAll()`:**
   - `runtime.selectedGroupConnIds.clear()`
   - `runtime.selectedNodeIds.clear()`, `runtime.selectedNodeId = null`
   - `clearConnectionSelectionState()`

Existing steps retained: **`reindexUserGroupHierarchy`**, **`dedupeUserGroupMembership`**, **`groupConnections` filtered to alive groups**, **`groupBoxCache = null`**, **`renderAll()`**.

## Integrity validation (manual)

| Check | Expected |
|-------|----------|
| Duplicated subtree | New **group** ids via `gidMap`; new **node** ids via `nodeMap`; new **node–node** ids; new **group connection** ids where applicable |
| Branch lines inside subtree | New **`branch-from`** rows only when parent **node–node** edge was duplicated (`connIdMap` hit) |
| Selection after op | Primary **group** = new root; **no** leftover node or connection selection |

## Regression risks

- **Branch-from** edges whose **parent connection** is **not** duplicated (one endpoint outside subtree) are still **intentionally skipped** — same as before for node–node edges that span the boundary.
- **Chaining** branch-from** (multiple levels) inherits correct parent ids as long as the parent **node–node** edge duplicated first (single pass preserves order from `snapConn` snapshot).

## Rollback

Revert the `connIdMap` / **branch-from** second pass and the expanded selection clears inside `duplicateUserGroup`, restoring the prior single-pass connection copy and minimal `runtime` resets.
