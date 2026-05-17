import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("would-you-rather voting + reveal syncs", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(400);

    await a.getByPlaceholder("option A").fill("tea");
    await a.getByPlaceholder("option B").fill("coffee");
    await a.getByRole("button", { name: "set prompt", exact: true }).click();

    await expect(b.locator(".wr-card-a")).toContainText("tea");
    await expect(b.locator(".wr-card-b")).toContainText("coffee");

    await a.getByRole("button", { name: "I'd rather A", exact: true }).click();
    await b.getByRole("button", { name: "I'd rather B", exact: true }).click();
    await a.getByRole("button", { name: "reveal", exact: true }).click();

    await expect(b.locator(".wr-bar-a")).toHaveAttribute("data-pct", "50");
    await expect(b.locator(".wr-bar-b")).toHaveAttribute("data-pct", "50");
  } finally {
    await cleanup();
  }
});
