import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("would-you-rather voting + reveal syncs to BOTH peers", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(400);

    // Alice composes the prompt — it (and the voting phase) must reach Bob.
    await a.getByPlaceholder("option A").fill("tea");
    await a.getByPlaceholder("option B").fill("coffee");
    await a.getByRole("button", { name: "set prompt", exact: true }).click();

    await expect(b.locator(".wr-card-a")).toContainText("tea");
    await expect(b.locator(".wr-card-b")).toContainText("coffee");
    // The phase transition (composing -> voting) propagated, so Bob sees the
    // vote buttons rather than the compose form.
    await expect(b.getByRole("button", { name: "I'd rather A", exact: true })).toBeVisible();

    // Split vote: alice picks A, bob picks B.
    await a.getByRole("button", { name: "I'd rather A", exact: true }).click();
    await b.getByRole("button", { name: "I'd rather B", exact: true }).click();

    // Alice reveals — the reveal phase must propagate to Bob.
    await a.getByRole("button", { name: "reveal", exact: true }).click();

    // Both peers land in the reveal phase: bars + "next round" button visible.
    await expect(a.locator(".wr-bar-a")).toBeVisible();
    await expect(b.locator(".wr-bar-a")).toBeVisible();
    await expect(a.getByRole("button", { name: "next round", exact: true })).toBeVisible();
    await expect(b.getByRole("button", { name: "next round", exact: true })).toBeVisible();

    // SAME tally on BOTH screens: 1 vote each = 50/50, one count each.
    for (const page of [a, b]) {
      await expect(page.locator(".wr-bar-a")).toHaveAttribute("data-pct", "50");
      await expect(page.locator(".wr-bar-b")).toHaveAttribute("data-pct", "50");
      await expect(page.locator(".wr-card-a .wr-count")).toContainText("1");
      await expect(page.locator(".wr-card-b .wr-count")).toContainText("1");
    }

    // A clear-winner case so we also prove the tally is not hard-coded 50/50:
    // both advance to next round, alice re-composes, then BOTH vote A.
    await a.getByRole("button", { name: "next round", exact: true }).click();
    await expect(b.getByPlaceholder("option A")).toBeVisible();
    await a.getByPlaceholder("option A").fill("dogs");
    await a.getByPlaceholder("option B").fill("cats");
    await a.getByRole("button", { name: "set prompt", exact: true }).click();
    await expect(b.locator(".wr-card-a")).toContainText("dogs");

    await a.getByRole("button", { name: "I'd rather A", exact: true }).click();
    await b.getByRole("button", { name: "I'd rather A", exact: true }).click();
    await a.getByRole("button", { name: "reveal", exact: true }).click();

    for (const page of [a, b]) {
      await expect(page.locator(".wr-bar-a")).toHaveAttribute("data-pct", "100");
      await expect(page.locator(".wr-bar-b")).toHaveAttribute("data-pct", "0");
      await expect(page.locator(".wr-card-a .wr-winner")).toBeVisible();
    }
  } finally {
    await cleanup();
  }
});
