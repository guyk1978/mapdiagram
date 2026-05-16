/**
 * Mirrors `escapeHtml` in `assets/md-runtime-diagnostics.js` — update both if rules change.
 */
import { describe, expect, it } from "vitest";

function escapeHtml(s: unknown): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

describe("escapeHtml (Phase 5 parity)", () => {
  it("neutralizes markup characters", () => {
    expect(escapeHtml('<img src=x>')).toBe("&lt;img src=x&gt;");
  });

  it("handles empty and nullish", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});
