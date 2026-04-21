import { test, expect } from "@playwright/test";

test.describe("environment setup", () => {
    test("go to invalid route", async ({ page }) => {
        await page.goto("http://localhost:3000/");
        await page.goto("/does-not-exist");
        await expect(page.getByRole("heading")).toContainText("That page is not part of Event Hub.");
        await expect(page.getByRole("link", { name: "Return Home" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Browse Events" })).toBeVisible();
    });
});

test.describe("home page navigation - logged out", () => {
    test("navigation shows all logged-out options", async ({ page }) => {
        await page.goto("http://localhost:3000/");
        await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Events", exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "Log In", exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Create Account" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Admin Dashboard" })).toBeVisible();
    });

    test("browse events btn navigates to events page, home link returns home", async ({ page }) => {
        await page.goto("http://localhost:3000/");
        await expect(page.getByRole("link", { name: "Browse Events" })).toBeVisible();
        await page.getByRole("link", { name: "Browse Events" }).click();
        await expect(page).toHaveURL(/\/events$/);
        await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
        await page.getByRole("link", { name: "Home" }).click();
        await expect(page.getByRole("banner")).toContainText("Discover the nights worth stepping out for");
    });
});

test.describe("home page navigation - logged in", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test("navigation shows all logged-in options", async ({ page }) => {
        await page.goto("http://localhost:3000/");
        const nav = page.getByRole("navigation");
        await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
        await expect(nav.getByRole("link", { name: "Events", exact: true })).toBeVisible();
        await expect(nav.getByRole("link", { name: "My Events", exact: true })).toBeVisible();
        await expect(nav.getByRole("link", { name: "My Calendar", exact: true })).toBeVisible();
        await expect(nav.getByRole("button", { name: "Log Out" })).toBeVisible();
        await expect(nav.getByRole("link", { name: "Admin Dashboard" })).toBeVisible();
    });
});
