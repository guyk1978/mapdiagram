// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  GENEALOGY_WORKSPACE_PRESETS,
  genealogySidebarTileMarkup,
  genealogyToolbarActionButtonMarkup,
  layoutGenealogyNonSpouseEdge,
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

  it("routes non-spouse genealogy edges bottom-center to top-center", () => {
    const fromNode = { id: "from", x: 120, y: 80, width: 160, height: 108 };
    const toNode = { id: "to", x: 420, y: 320, width: 160, height: 108 };
    const getNodeWorldPosition = (n: { x: number; y: number }) => ({ x: n.x, y: n.y });
    const out = layoutGenealogyNonSpouseEdge(fromNode, toNode, getNodeWorldPosition);

    expect(out.from).toEqual({ x: 200, y: 188, edge: "bottom" });
    expect(out.to).toEqual({ x: 500, y: 320, edge: "top" });
    expect(out.d).toBe("M 200 188 L 200 254 L 500 254 L 500 320");
  });

  it("renders toolbar Add Male/Add Female icon markup", () => {
    const maleMarkup = genealogyToolbarActionButtonMarkup("male", "Add Male");
    const femaleMarkup = genealogyToolbarActionButtonMarkup("female", "Add Female");
    expect(maleMarkup).toContain("Add Male");
    expect(maleMarkup).toContain('stroke="#ffffff"');
    expect(maleMarkup).toContain('stroke-width="2"');
    expect(maleMarkup).toContain('fill="none"');
    expect(femaleMarkup).toContain("Add Female");
    expect(femaleMarkup).toContain("gene-toolbar-icon--female");
  });
});
