import { test, expect } from "@playwright/test";
import { BASE_URL, SEEDED_EVENTS, getEventHrefByTitle, goto, registerUser } from "./helpers/eventHub.helpers.js";

test.describe("Environment setup and home page navigation", () => {
    test("ENV-001 - home page loads with the configured local app", async ({ page }) => {
        await goto(page, "/");
        await expect(page).toHaveURL(BASE_URL + "/");
        await expect(page.getByRole("heading", { level: 1 })).toContainText("Event Hub");
    });

    test("ENV-003 - invalid route shows the 404 page with recovery links", async ({ page }) => {
        await goto(page, "/does-not-exist");
        await expect(page.getByRole("heading", { level: 1 })).toContainText("That page is not part of Event Hub.");
        await expect(page.getByRole("link", { name: /return home/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /browse events/i })).toBeVisible();
    });

    test("HOME-001 - opening the root URL displays the home page", async ({ page }) => {
        await goto(page, "/");
        await expect(page.getByRole("heading", { level: 1 })).toContainText("Event Hub");
    });

    test("HOME-002 - logged-out navigation shows the public options", async ({ page }) => {
        await goto(page, "/");
        // Scope repeated nav checks to the landmark
        const nav = page.getByRole("navigation");

        await expect(nav.getByRole("link", { name: /^home$/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /^events$/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /^log in$/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /^register$/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /create account/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /admin dashboard/i })).toBeVisible();
    });

    test("HOME-003 - logged-in navigation shows user links, name, and logout", async ({ page }) => {
        const user = await registerUser(page, { name: "Nav User" });

        await goto(page, "/");
        // The signed-in nav exposes user-only destinations and the user's display name
        const nav = page.getByRole("navigation");

        await expect(nav.getByRole("link", { name: /^home$/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /^events$/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /^my events$/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /^my calendar$/i })).toBeVisible();
        await expect(nav.getByText(user.name)).toBeVisible();
        await expect(nav.getByRole("button", { name: /log out/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /admin dashboard/i })).toBeVisible();
    });

    test("HOME-004 - public navigation moves between Home and Events", async ({ page }) => {
        await goto(page, "/");
        const browseEventsLink = page.getByRole("link", { name: /browse events/i }).first();
        const href = await browseEventsLink.getAttribute("href");
        await goto(page, href || "/events");
        await expect(page).toHaveURL(/\/events$/);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(/explore the full event hub lineup/i);

        await page.getByRole("link", { name: /^home$/i }).click();
        await expect(page).toHaveURL(BASE_URL + "/");
        await expect(page.getByRole("heading", { level: 1 })).toContainText("Event Hub");
    });

    test("HOME-005 - only one home-page destination should point to My Events", async ({ page }) => {
        await registerUser(page, { name: "Duplicate Link User" });

        await goto(page, "/");
        await expect(page.getByRole("navigation").locator('a[href="/events/registrations"]')).toHaveCount(1);
    });

    test("HOME-006 - only one home-page destination should point to My Calendar", async ({ page }) => {
        await registerUser(page, { name: "Duplicate Calendar User" });

        await goto(page, "/");
        await expect(page.getByRole("navigation").locator('a[href="/events/registrations/calendar"]')).toHaveCount(1);
    });
});
