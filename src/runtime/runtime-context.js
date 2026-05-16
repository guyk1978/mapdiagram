/**
 * Shared runtime context for Phase 6 extracted modules.
 * @param {object} deps
 * @returns {Readonly<object>}
 */
export function createRuntimeContext(deps) {
  const listeners = new Map();
  return Object.freeze({
    runtime: deps.runtime,
    getProject: deps.getProject,
    markDirty: deps.markDirty,
    dom: Object.freeze(deps.dom || {}),
    emit(type, payload) {
      if (typeof deps.emit === "function") deps.emit(type, payload);
      const set = listeners.get(type);
      if (set) for (const fn of set) fn(payload);
    },
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type)?.delete(fn);
    },
  });
}
