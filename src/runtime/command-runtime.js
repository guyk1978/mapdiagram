/**
 * Command registry foundation (Phase 6) — does not replace undo stacks.
 */

export function createCommandRuntime(ctx, deps) {
  const registry = new Map();

  function registerCommand(name, spec) {
    if (!name || !spec?.execute) throw new Error("registerCommand requires name and execute");
    registry.set(name, { describe: spec.describe || name, execute: spec.execute });
    return () => registry.delete(name);
  }

  function executeCommand(name, payload, opts = {}) {
    const cmd = registry.get(name);
    if (!cmd) throw new Error(`Unknown command: ${name}`);
    if (opts.pushHistory !== false && deps.shouldPushHistory !== false) deps.pushHistory?.();
    return cmd.execute(payload, ctx);
  }

  function hasCommand(name) {
    return registry.has(name);
  }

  function listCommands() {
    return [...registry.keys()];
  }

  return {
    registerCommand,
    executeCommand,
    hasCommand,
    listCommands,
    _registry: registry,
  };
}
