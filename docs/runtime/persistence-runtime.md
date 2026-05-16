# Persistence runtime (documented boundary — not extracted in Phase 6)

## Local storage

- Key: `mapdiagram-db-v1` (`DB_KEY`)
- `loadDB()` / `saveDB()` — `runtime.db` envelope with `projects[]`, `activeProjectId`
- `markDirty()` → debounced autosave (`runtime.autosaveTimer`)

## Project shape (per active project)

- `nodes`, `connections`, `userGroups`, `groupConnections`, `flowGroups`, `view`, `title`, `projectId`

## Cloud (monolith)

- Supabase client on `runtime.supabase`
- `scheduleCloudSync()`, auth UI
- Edge functions for AI credits

## Phase 6 note

Extraction deferred to avoid coupling editor session with network/auth. Runtime modules use `getProject()` only; they do not call `saveDB` directly except via `markDirty` callback.

## Risk if extracted later

- Undo stacks must snapshot before async save
- Conflict resolution with cloud sync
