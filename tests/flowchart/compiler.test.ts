import { readFileSync } from "node:fs";

import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {

  validateFlowchartSpec,

  layoutFlowchart,

  beautifyFlowchartLayout,

  compileFlowchartToCanvas,

  compileFlowchartSpecWithRetries,

  createMockFlowchartCompleter,

  normalizeFlowchartSpec,

  exportCanvasToFlowchartSpec,

  backEdges,

  qualityScoreFlowchart,

} from "../../src/flowchart/index";



const FIXTURES = [

  "linear-onboarding",

  "approval-flow",

  "support-escalation",

  "bug-triage",

  "multi-branch",

  "qa-retry-flow",

  "customer-escalation",

  "merge-heavy",

  "deep-branch-tree",

] as const;



function loadFixture(name: string) {

  const p = resolve(__dirname, "fixtures", `${name}.json`);

  return JSON.parse(readFileSync(p, "utf8"));

}



function rectsOverlap(

  a: { x: number; y: number; width: number; height: number },

  b: { x: number; y: number; width: number; height: number },

  pad = 8,

): boolean {

  return !(

    a.x + a.width + pad <= b.x ||

    b.x + b.width + pad <= a.x ||

    a.y + a.height + pad <= b.y ||

    b.y + b.height + pad <= a.y

  );

}



describe("validateFlowchartSpec", () => {

  for (const name of FIXTURES) {

    it(`accepts golden fixture: ${name}`, () => {

      const v = validateFlowchartSpec(loadFixture(name));

      expect(v.ok).toBe(true);

      if (v.ok) {

        expect(v.spec.nodes.length).toBeGreaterThan(0);

        expect(v.spec.edges.length).toBeGreaterThan(0);

      }

    });

  }



  it("accepts controlled back-edge in approval flow", () => {

    const v = validateFlowchartSpec(loadFixture("approval-flow"));

    expect(v.ok).toBe(true);

    if (v.ok) {

      expect(backEdges(v.spec.edges).length).toBe(1);

    }

  });



  it("rejects uncontrolled full cycle", () => {

    const raw = loadFixture("linear-onboarding");

    raw.edges.push({ from: "end", to: "start" });

    const v = validateFlowchartSpec(raw);

    expect(v.ok).toBe(false);

    if (!v.ok) {

      expect(v.errors.some((e) => /cycle|back-edge|acyclic/i.test(e))).toBe(true);

    }

  });



  it("rejects more than 2 back-edges", () => {

    const raw = loadFixture("approval-flow");

    raw.edges.push({ from: "submit", to: "start", meta: { isBackEdge: true } });

    raw.edges.push({ from: "complete", to: "submit", meta: { isBackEdge: true } });

    const v = validateFlowchartSpec(raw);

    expect(v.ok).toBe(false);

    if (!v.ok) expect(v.errors.some((e) => e.includes("back-edge"))).toBe(true);

  });



  it("rejects back-edge to non-ancestor", () => {

    const raw = loadFixture("approval-flow");

    raw.edges.push({ from: "review", to: "complete", meta: { isBackEdge: true } });

    const v = validateFlowchartSpec(raw);

    expect(v.ok).toBe(false);

    if (!v.ok) expect(v.errors.some((e) => e.includes("ancestor"))).toBe(true);

  });



  it("rejects missing start", () => {

    const raw = loadFixture("linear-onboarding");

    raw.nodes[0].kind = "process";

    const v = validateFlowchartSpec(raw);

    expect(v.ok).toBe(false);

  });

});



describe("normalizeFlowchartSpec", () => {

  it("shortens verbose labels and normalizes Yes/No", () => {

    const raw = {

      version: 1,

      title: "Test",

      direction: "TB",

      nodes: [

        { id: "start", label: "Start", kind: "start" },

        { id: "q", label: "Manager reviews the submitted expense request", kind: "decision" },

        { id: "end", label: "Complete", kind: "end" },

      ],

      edges: [

        { from: "start", to: "q" },

        { from: "q", to: "end", label: "approved" },

      ],

    };

    const spec = normalizeFlowchartSpec(raw as import("../../src/flowchart/flowchart-spec").FlowchartSpec);

    const q = spec.nodes.find((n) => n.id === "q");

    expect(q?.label.length).toBeLessThan(40);

    expect(spec.edges.some((e) => e.label === "Yes")).toBe(true);

  });

});



describe("layout + beautify determinism", () => {

  for (const name of FIXTURES) {

    it(`stable layout for ${name}`, () => {

      const v = validateFlowchartSpec(loadFixture(name));

      if (!v.ok) throw new Error("fixture invalid");

      const spec = v.spec;

      const t0 = performance.now();

      const a = beautifyFlowchartLayout(spec, layoutFlowchart(spec));

      const ms = performance.now() - t0;

      const b = beautifyFlowchartLayout(spec, layoutFlowchart(spec));

      expect(ms).toBeLessThan(120);

      for (const [id, ra] of a) {

        const rb = b.get(id)!;

        expect(ra.x).toBe(rb.x);

        expect(ra.y).toBe(rb.y);

      }

    });



    it(`no overlaps after beautify: ${name}`, () => {

      const v = validateFlowchartSpec(loadFixture(name));

      if (!v.ok) throw new Error("fixture invalid");

      const layout = beautifyFlowchartLayout(v.spec, layoutFlowchart(v.spec));

      const rects = [...layout.values()];

      for (let i = 0; i < rects.length; i++) {

        for (let j = i + 1; j < rects.length; j++) {

          expect(rectsOverlap(rects[i], rects[j])).toBe(false);

        }

      }

    });

  }

});



describe("compileFlowchartToCanvas", () => {

  it("produces canvas-compatible nodes and connections", () => {

    const v = validateFlowchartSpec(loadFixture("approval-flow"));

    if (!v.ok) throw new Error("fixture invalid");

    let id = 0;

    const payload = compileFlowchartToCanvas(v.spec, "test", () => `conn_${++id}`);

    expect(payload.nodes.length).toBe(v.spec.nodes.length);

    expect(payload.connections.length).toBe(v.spec.edges.length);

    const backConn = payload.connections.find((c) => c.meta?.isBackEdge);

    expect(backConn?.strokeDash).toBe("dashed");

    for (const n of payload.nodes) {

      expect(n.title).toBeTruthy();

      expect(n.type).toBeTruthy();

      expect(n.shape).toBeTruthy();

      expect(n.width).toBeGreaterThan(0);

      expect(n.height).toBeGreaterThan(0);

    }

    for (const c of payload.connections) {

      expect(payload.nodes.some((n) => n.id === c.from)).toBe(true);

      expect(payload.nodes.some((n) => n.id === c.to)).toBe(true);

    }

  });

});



describe("exportCanvasToFlowchartSpec", () => {

  it("round-trips logic without geometry", () => {

    const v = validateFlowchartSpec(loadFixture("qa-retry-flow"));

    if (!v.ok) throw new Error("fixture invalid");

    let id = 0;

    const payload = compileFlowchartToCanvas(v.spec, "rt", () => `c_${++id}`);

    const exported = exportCanvasToFlowchartSpec({

      title: payload.title,

      nodes: payload.nodes,

      connections: payload.connections,

    });

    expect(exported.nodes.length).toBe(v.spec.nodes.length);

    expect(exported.edges.length).toBe(v.spec.edges.length);

    expect(exported.edges.some((e) => e.meta?.isBackEdge)).toBe(true);

    expect(validateFlowchartSpec(exported).ok).toBe(true);

  });

});



describe("qualityScoreFlowchart", () => {
  it("scores approval fixture as indexable", () => {
    const v = validateFlowchartSpec(loadFixture("approval-flow"));
    if (!v.ok) throw new Error("fixture invalid");
    const q = qualityScoreFlowchart({
      title: v.spec.title,
      nodes: v.spec.nodes,
      connections: v.spec.edges,
      editCount: 2,
    });
    expect(q.score).toBeGreaterThanOrEqual(62);
    expect(q.isIndexable).toBe(true);
  });

  it("rejects thin diagrams for indexing", () => {
    const q = qualityScoreFlowchart({
      title: "X",
      nodes: [{ label: "A", kind: "start" }],
      connections: [],
    });
    expect(q.isIndexable).toBe(false);
  });
});

describe("compileFlowchartSpecWithRetries", () => {

  it("mock completer returns valid spec", async () => {

    const spec = await compileFlowchartSpecWithRetries(

      "approval workflow with review",

      createMockFlowchartCompleter(),

      2,

    );

    expect(spec.nodes.some((n) => n.kind === "start")).toBe(true);

    expect(spec.nodes.some((n) => n.kind === "end")).toBe(true);

  });

});

