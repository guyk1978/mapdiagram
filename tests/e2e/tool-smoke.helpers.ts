import type { Page } from "@playwright/test";

export const TOOL_URL = "/app/tool.html?mdTest=1";

export type MdSelection = {
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedGroupId: string | null;
  selectedGroupIds: string[];
  selectedGroupConnId: string | null;
  selectedGroupConnIds: string[];
  selectedConnectionId: string | null;
  selectedConnectionIds: string[];
  focusGroupId: string | null;
};

export async function primeToolStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("flowchart-onboarded", "1");
    localStorage.setItem(
      "mapdiagram-db-v1",
      JSON.stringify({
        projects: [
          {
            projectId: "e2e-proj",
            name: "E2E",
            title: "E2E",
            nodes: [],
            connections: [],
            userGroups: [],
            groupConnections: [],
            flowGroups: [],
            view: { x: 0, y: 0, zoom: 1, grid: true },
            updatedAt: Date.now(),
          },
        ],
        activeProjectId: "e2e-proj",
        shares: {},
      }),
    );
  });
}

export async function openTool(page: Page) {
  await primeToolStorage(page);
  await page.goto(TOOL_URL, { waitUntil: "load", timeout: 120_000 });
  await page.waitForSelector("#workspace", { timeout: 60_000 });
  await page.waitForFunction(() => (window as unknown as { __mdTest?: unknown }).__mdTest != null, null, {
    timeout: 120_000,
  });
}

export async function seedGroupsFixture(page: Page) {
  await page.evaluate(() => {
    (window as Window & { __mdTest: { seedGroupsFixture: () => void } }).__mdTest.seedGroupsFixture();
  });
  await page.waitForSelector('.group-chrome[data-group-id="g1"]', { timeout: 30_000 });
}

export async function getSelection(page: Page): Promise<MdSelection> {
  return page.evaluate(() => {
    return (window as Window & { __mdTest: { getSelection: () => MdSelection } }).__mdTest.getSelection();
  });
}

export async function selectGroup(page: Page, groupId: string) {
  const ok = await page.evaluate((id) => {
    return (window as Window & { __mdTest: { selectGroupById: (gid: string) => boolean } }).__mdTest.selectGroupById(
      id,
    );
  }, groupId);
  if (!ok) throw new Error(`selectGroupById failed for ${groupId}`);
}

export async function clickWorkspaceCanvas(page: Page) {
  await page.evaluate(() => {
    const ws = document.getElementById("workspace");
    if (!ws) throw new Error("workspace missing");
    ws.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 40,
        clientY: 40,
      }),
    );
    ws.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: 40,
        clientY: 40,
      }),
    );
  });
}
