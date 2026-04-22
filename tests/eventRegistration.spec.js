import { test, expect } from "@playwright/test";
import { createNewUser, openEvent } from "./helpers/eventHelpers.js";

const OPEN_EVENT = "TestOpenEvent";
const FULL_EVENT = "TestFullEvent";

test.describe("Event registration", () => {
    test("EVENT-001 / EVENT-002: event card appears in directory and links to details", async ({ page }) => {
        await page.goto("/events");

        const card = page.getByRole("link", { name: new RegExp(OPEN_EVENT) }).first();
        await expect(card).toBeVisible();

        await card.click();
        await expect(page.getByRole("heading", { name: OPEN_EVENT })).toBeVisible();
    });

    test("EVENT-003: event details page shows basic event info", async ({ page }) => {
        await openEvent(page, OPEN_EVENT);

        await expect(page.getByText(/kingston/i)).toBeVisible();
        await expect(page.getByText(/testing/i)).toBeVisible();
        await expect(page.getByText(/available slots/i)).toBeVisible();
    });

    test("EVENT-004: logged out user sees login/create account actions", async ({ page }) => {
        await openEvent(page, OPEN_EVENT);

        await expect(page.getByRole("link", { name: /log in to register/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /create account/i }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /back to events/i })).toBeVisible();
    });

    test("EVENT-005 / BOOK-POS-001: logged in user can open registration form", async ({ page }) => {
        await createNewUser(page);
        await openEvent(page, OPEN_EVENT);

        await page.getByRole("link", { name: /register for this event/i }).click();
        await expect(page).toHaveURL(/\/events\/.*\/register$/);
        await expect(page.getByLabel(/seat count/i)).toBeVisible();
    });

    test("EVENT-006 / BOOK-POS-002 / BOOK-POS-003 / BOOK-POS-004: user registers for event successfully", async ({
        page,
    }) => {
        await createNewUser(page);
        await openEvent(page, OPEN_EVENT);

        await page.getByRole("link", { name: /register for this event/i }).click();
        await page.getByLabel(/seat count/i).fill("1");
        await page.getByRole("button", { name: /add to my calendar/i }).click();

        await expect(page).toHaveURL(/\/events\/registrations/);
        await expect(page.getByText(/registration created successfully/i)).toBeVisible();

        await page.getByRole("link", { name: new RegExp(OPEN_EVENT) }).click();
        await expect(page.getByRole("link", { name: /update my seats/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /view my calendar/i })).toBeVisible();
    });

    test("EVENT-007: full event does not show register button", async ({ page }) => {
        await createNewUser(page);
        await openEvent(page, FULL_EVENT);

        await expect(page.getByText(/this event is full/i)).toBeVisible();
        await expect(page.getByRole("link", { name: /register for this event/i })).toHaveCount(0);
    });
});
