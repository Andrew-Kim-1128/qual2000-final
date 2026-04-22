import { test, expect } from "@playwright/test";
import { createNewUser, openEvent } from "./helpers/eventHelpers.js";

// events created in global-setup.js
const OPEN_EVENT = "TestOpenEvent";
const FULL_EVENT = "TestFullEvent";

test.describe("Event registration", () => {
    // ----- positive tests -----
    test("event-001 / event-002: event card appears in directory and links to details", async ({ page }) => {
        await page.goto("/events");

        const card = page.getByRole("link", { name: new RegExp(OPEN_EVENT) }).first();
        await expect(card).toBeVisible();

        await card.click();
        await expect(page.getByRole("heading", { name: OPEN_EVENT })).toBeVisible();
    });

    test("event-003: event details page shows basic event info", async ({ page }) => {
        await openEvent(page, OPEN_EVENT);

        await expect(page.getByText(/kingston/i)).toBeVisible();
        await expect(page.getByText(/testing/i)).toBeVisible();
        await expect(page.getByText(/available slots/i)).toBeVisible();
    });

    test("event-004: logged out user sees login/create account actions", async ({ page }) => {
        await openEvent(page, OPEN_EVENT);

        await expect(page.getByRole("link", { name: /log in to register/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /create account/i }).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /back to events/i })).toBeVisible();
    });

    test("event-005 / book-pos-001: logged in user can open registration form", async ({ page }) => {
        await createNewUser(page);
        await openEvent(page, OPEN_EVENT);

        await page.getByRole("link", { name: /register for this event/i }).click();
        await expect(page).toHaveURL(/\/events\/.*\/register$/);
        await expect(page.getByLabel(/seat count/i)).toBeVisible();
    });

    test("event-006 / book-pos-002 / book-pos-003 / book-pos-004: user registers for event successfully", async ({
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

    test("event-007: full event does not show register button", async ({ page }) => {
        await createNewUser(page);
        await openEvent(page, FULL_EVENT);

        await expect(page.getByText(/this event is full/i)).toBeVisible();
        await expect(page.getByRole("link", { name: /register for this event/i })).toHaveCount(0);
    });

    // ----- negative tests -----
    test("book-neg-001: user redirected to /login", async ({ page }) => {
        await page.goto("/");
        await page.getByRole("link", { name: "Events", exact: true }).click();
        await page
            .getByRole("link", {
                name: /TestOpenEvent/,
            })
            .first()
            .click();
        await page.getByRole("link", { name: "Log In To Register" }).click();
        await expect(page.getByRole("heading", { name: "Log in to manage your events." })).toBeVisible();
    });

    test("book-neg-002: seat count of 0 shows validation error", async ({ page }) => {
        await createNewUser(page);
        await openEvent(page, OPEN_EVENT);
        await page.getByRole("link", { name: /register for this event/i }).click();

        const seatCount = page.getByLabel(/seat count/i);
        await seatCount.fill("0");
        await page.getByRole("button", { name: /add to my calendar/i }).click();
        await expect(page).toHaveURL(/\/events\/.*\/register$/);

        const isValid = await seatCount.evaluate((el) => el.checkValidity());
        expect(isValid).toBe(false);
        const validationMessage = await seatCount.evaluate((el) => el.validationMessage);
        expect(validationMessage.length).toBeGreaterThan(0);
    });

    test("book-neg-003: seat count above per-user limit is blocked", async ({ page }) => {
        await createNewUser(page);
        await openEvent(page, OPEN_EVENT);
        await page.getByRole("link", { name: /register for this event/i }).click();

        const seatCount = page.getByLabel(/seat count/i);
        await seatCount.fill("11");
        await page.getByRole("button", { name: /add to my calendar/i }).click();
        await expect(page).toHaveURL(/\/events\/.*\/register$/);

        const validity = await seatCount.evaluate((el) => ({
            valid: el.validity.valid,
            rangeOverflow: el.validity.rangeOverflow,
            message: el.validationMessage,
        }));
        expect(validity.valid).toBe(false);
        expect(validity.rangeOverflow).toBe(true);
        expect(validity.message.length).toBeGreaterThan(0);
    });

    test("book-neg-004: seat count larger than remaining capacity is blocked", async ({ page }) => {
        await createNewUser(page);
        await openEvent(page, OPEN_EVENT);

        const pageText = await page.locator("body").innerText();
        const match = pageText.match(/Available Slots\s*:?\s*(\d+)/i);
        expect(match).not.toBeNull();

        const availableSlots = Number(match[1]);
        const tooManySeats = availableSlots + 1;
        await page.getByRole("link", { name: /register for this event/i }).click();

        const seatCount = page.getByLabel(/seat count/i);
        await seatCount.fill(String(tooManySeats));
        await page.getByRole("button", { name: /add to my calendar/i }).click();
        await expect(page).toHaveURL(/\/events\/.*\/register$/);

        const validity = await seatCount.evaluate((el) => ({
            valid: el.validity.valid,
            rangeOverflow: el.validity.rangeOverflow,
            message: el.validationMessage,
        }));
        expect(validity.valid).toBe(false);
        expect(validity.message.length).toBeGreaterThan(0);
    });
});
