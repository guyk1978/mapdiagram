// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  GENEALOGY_WORKSPACE_PRESETS,
  genealogySidebarTileMarkup,
  layoutGenealogySpouseEdge,
} from "../../src/runtime/genealogy-runtime.js";

describe("genealogy-runtime", () => {
  it("keeps Family Profiles as Male/Female only", () => {
    const profiles = GENEALOGY_WORKSPACE_PRESETS.filter((p) => p.libraryCategory === "profiles");
    expect(profiles.map((p) => p.genealogyRole)).toEqual(["male", "female"]);
  });

  it("renders bright sidebar svg attributes", () => {
    const male = GENEALOGY_WORKSPACE_PRESETS.find((p) => p.genealogyRole === "male");
    expect(male).toBeTruthy();
    const markup = genealogySidebarTileMarkup(male!);
    expect(markup).toContain('stroke="#ffffff"');
    expect(markup).toContain('stroke-width="2"');
    expect(markup).toContain('fill="none"');
    expect(markup).toContain("node-tile__gene-icon--male");
  });

  it("routes spouse edge from left right-center to right left-center", () => {
    const a = { id: "a", x: 100, y: 100, width: 160, height: 108 };
    const b = { id: "b", x: 420, y: 100, width: 160, height: 108 };
    const getNodeWorldPosition = (n: { x: number; y: number }) => ({ x: n.x, y: n.y });
    const out = layoutGenealogySpouseEdge(a, b, getNodeWorldPosition);

    expect(out.from.edge).toBe("right");
    expect(out.to.edge).toBe("left");
    expect(out.from.x).toBe(260);
    expect(out.to.x).toBe(420);
    expect(out.from.y).toBe(154);
    expect(out.to.y).toBe(154);
    expect(out.d).toBe("M 260 154 L 420 154");
  });
});
