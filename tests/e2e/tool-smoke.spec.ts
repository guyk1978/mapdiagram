import { expect, test } from "@playwright/test";
import {
  clickWorkspaceCanvas,
  getSelection,
  openTool,
  seedGroupsFixture,
  selectGroup,
} from "./tool-smoke.helpers.js";

test.describe("tool.html smoke", () => {
  test.beforeEach(async ({ page }) => {
    await openTool(page);
    await seedGroupsFixture(page);
  });

  test("group selection persists after empty canvas click", async ({ page }) => {
    await selectGroup(page, "g1");
    await expect.poll(async () => (await getSelection(page)).selectedGroupIds).toEqual(["g1"]);

    await clickWorkspaceCanvas(page);

    const sel = await getSelection(page);
    expect(sel.selectedGroupIds).toContain("g1");
    expect(sel.selectedGroupId).toBe("g1");
    expect(sel.selectedNodeIds).toEqual([]);

    const selectedChrome = await page.evaluate(() => {
      return (window as Window & { __mdTest: { getGroupChromeSelectedCount: () => number } }).__mdTest
        .getGroupChromeSelectedCount();
    });
    expect(selectedChrome).toBeGreaterThan(0);
  });

  test("focus mode enter and exit", async ({ page }) => {
    await page.evaluate(() => {
      (window as Window & { __mdTest: { enterGroupFocusMode: (id: string) => void } }).__mdTest.enterGroupFocusMode(
        "g1",
      );
    });
    await expect(page.locator("#focusGroupChip")).toHaveClass(/open/);

    await page.evaluate(() => {
      (window as Window & { __mdTest: { exitGroupFocusMode: () => void } }).__mdTest.exitGroupFocusMode();
    });
    await expect(page.locator("#focusGroupChip")).not.toHaveClass(/open/);
    await expect.poll(async () => (await getSelection(page)).focusGroupId).toBeNull();
  });

  test("group connection can be created and rendered", async ({ page }) => {
    const created = await page.evaluate(() => {
      const md = window as Window & {
        __mdTest: {
          startGroupConnectionDrag: (id: string) => void;
          simulateGroupConnectToGroup: (toId: string) => boolean;
        };
      };
      md.__mdTest.startGroupConnectionDrag("g1");
      return md.__mdTest.simulateGroupConnectToGroup("g2");
    });
    expect(created).toBe(true);

    await expect.poll(async () => {
      return page.evaluate(() => {
        return (window as Window & { __mdTest: { getGroupConnectionCount: () => number } }).__mdTest
          .getGroupConnectionCount();
      });
    }).toBe(1);

    await expect(page.locator("path.group-conn")).toHaveCount(1);
  });

  test("delete group frame can be undone", async ({ page }) => {
    await selectGroup(page, "g1");
    await page.evaluate(() => {
      const md = window as Window & {
        __mdTest: { pushHistory: () => void; removeUserGroupFrame: (id: string) => void };
      };
      md.__mdTest.pushHistory();
      md.__mdTest.removeUserGroupFrame("g1");
    });
    await expect(page.locator('.group-chrome[data-group-id="g1"]')).toHaveCount(0);

    await page.evaluate(() => {
      (window as Window & { __mdTest: { undo: () => void } }).__mdTest.undo();
    });
    await expect(page.locator('.group-chrome[data-group-id="g1"]')).toHaveCount(1);
  });

  test("ungroup selected user group removes frame", async ({ page }) => {
    await selectGroup(page, "g2");
    await page.evaluate(() => {
      (window as Window & { __mdTest: { ungroupUserGroup: () => boolean } }).__mdTest.ungroupUserGroup();
    });
    await expect(page.locator('.group-chrome[data-group-id="g2"]')).toHaveCount(0);
    await expect.poll(async () => (await getSelection(page)).selectedGroupIds).toEqual([]);
  });

  test("canvas click clears group connection selection", async ({ page }) => {
    await page.evaluate(() => {
      (window as Window & { __mdTest: { seedGroupConnectionFixture: () => void } }).__mdTest.seedGroupConnectionFixture();
    });
    await page.locator('path.conn-hit[data-gc-id="gc1"]').waitFor({ state: "attached" });

    const selected = await page.evaluate(() => {
      return (window as Window & { __mdTest: { selectGroupConnectionById: (id: string) => boolean } }).__mdTest
        .selectGroupConnectionById("gc1");
    });
    expect(selected).toBe(true);

    await expect.poll(async () => (await getSelection(page)).selectedGroupConnId).toBe("gc1");

    await clickWorkspaceCanvas(page);

    const sel = await getSelection(page);
    expect(sel.selectedGroupConnIds).toEqual([]);
    expect(sel.selectedGroupConnId).toBeNull();
  });
});
