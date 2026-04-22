import { test, expect } from "@playwright/test";
import {
    createEventAsAdmin,
    ensureBaselinePublicEvents,
    logoutAdmin,
    SEEDED_EVENTS,
    disableHtmlValidation,
    getEventIdByTitle,
    goto,
    openEventFromDirectory,
    registerFreshUserForEvent,
    registerUser,
    uniqueEmail,
} from "./helpers/eventHub.helpers.js";

test.describe("Event registration", () => {
    test.beforeEach(async ({ page }) => {
        // Keep the public catalog available even when the backing database is partially seeded
        await ensureBaselinePublicEvents(page);
    });

    test("BOOK-POS-001 - Register For This Event opens the registration form", async ({ page }) => {
        await registerUser(page, {
            name: "Book Pos User 1",
            email: uniqueEmail("bookpos1"),
            password: "1234",
        });

        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);
        await page.getByRole("link", { name: /register for this event/i }).click();

        await expect(page).toHaveURL(/\/events\/[a-f0-9]{24}\/register$/i);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(/reserve your place/i);
    });

    test("BOOK-POS-002 - the registration form shows event and user summary details", async ({ page }) => {
        await registerUser(page, {
            name: "Book Pos User 2",
            email: uniqueEmail("bookpos2"),
            password: "1234",
        });

        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);
        await page.getByRole("link", { name: /register for this event/i }).click();
        // Scope the summary assertions to the event snapshot panel to avoid duplicate title matches
        const eventSnapshot = page.locator(".detail-panel").first();

        await expect(eventSnapshot).toContainText(/event snapshot/i);
        await expect(eventSnapshot).toContainText(SEEDED_EVENTS.SPRING_MUSIC);
        await expect(eventSnapshot).toContainText(/registered user/i);
        await expect(page.getByLabel(/seat count/i)).toBeVisible();
        await expect(eventSnapshot).toContainText(/available slots/i);
    });

    test("BOOK-POS-003 - a valid seat count is accepted on the registration form", async ({ page }) => {
        await registerUser(page, {
            name: "Book Pos User 3",
            email: uniqueEmail("bookpos3"),
            password: "1234",
        });

        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);
        await page.getByRole("link", { name: /register for this event/i }).click();

        await page.getByLabel(/seat count/i).fill("2");
        await expect(page.getByLabel(/seat count/i)).toHaveValue("2");
        await expect(page.getByText(/please choose a whole number of seats between 1 and 10/i)).toHaveCount(0);
    });

    test("BOOK-POS-004 - a valid registration redirects to My Events and reduces availability", async ({ page }) => {
        // Use an isolated event so parallel tests cannot mutate the expected availability count
        const event = await createEventAsAdmin(page, {
            title: `PW Booking Event ${Date.now()}`,
            date: "2026-05-20",
            location: "Innovation Hub, Kingston",
            category: "Workshop",
            image: "https://example.com/booking-event.jpg",
            description: "Dedicated registration event for BOOK-POS-004.",
            availableSlots: 30,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Book Pos User 4",
            email: uniqueEmail("bookpos4"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        const row = page.locator("tr").filter({ hasText: event.title }).first();
        await expect(row).toBeVisible();
        await expect(row).toContainText("2");

        await openEventFromDirectory(page, event.title);
        await expect(page.getByRole("complementary")).toContainText(/available slots\s*28/i);
    });
});

test.describe("Invalid event registration", () => {
    test.beforeEach(async ({ page }) => {
        await ensureBaselinePublicEvents(page);
    });

    test("BOOK-NEG-001 - logged-out registration flow redirects to /login", async ({ page }) => {
        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);
        await page.getByRole("link", { name: /log in to register/i }).click();

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(/log in to manage your events/i);
    });

    test("BOOK-NEG-002 - seat count of 0 shows the validation error", async ({ page }) => {
        await registerUser(page, {
            name: "Book Neg User 2",
            email: uniqueEmail("bookneg2"),
            password: "1234",
        });

        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);
        await page.getByRole("link", { name: /register for this event/i }).click();

        await disableHtmlValidation(page);
        await page.getByLabel(/seat count/i).fill("0");
        // Submit the real registration form directly to guarantee the server-side validation branch runs
        await page.locator('form[action*="/register"]').evaluate((form) => form.submit());

        await expect(page).toHaveURL(/\/events\/[a-f0-9]{24}\/register$/i);
        await expect(page.getByText(/please choose a whole number of seats between 1 and 10/i)).toBeVisible();
    });

    test("BOOK-NEG-003 - seat count above 10 is rejected", async ({ page }) => {
        await registerUser(page, {
            name: "Book Neg User 3",
            email: uniqueEmail("bookneg3"),
            password: "1234",
        });

        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);
        await page.getByRole("link", { name: /register for this event/i }).click();

        await disableHtmlValidation(page);
        await page.getByLabel(/seat count/i).fill("11");
        await page.locator('form[action*="/register"]').evaluate((form) => form.submit());

        await expect(page.getByText(/please choose a whole number of seats between 1 and 10/i)).toBeVisible();
    });

    test("BOOK-NEG-004 - requesting more seats than the event capacity is rejected", async ({ page }) => {
        const event = await createEventAsAdmin(page, {
            title: `PW Capacity Event ${Date.now()}`,
            date: "2026-05-21",
            location: "Innovation Hub, Kingston",
            category: "Workshop",
            image: "https://example.com/capacity-event.jpg",
            description: "Dedicated capacity-check event for BOOK-NEG-004.",
            availableSlots: 5,
        });
        await logoutAdmin(page);

        await registerUser(page, {
            name: "Book Neg User 4",
            email: uniqueEmail("bookneg4"),
            password: "1234",
        });

        await openEventFromDirectory(page, event.title);
        await page.getByRole("link", { name: /register for this event/i }).click();

        await disableHtmlValidation(page);
        await page.getByLabel(/seat count/i).fill("6");
        await page.locator('form[action*="/register"]').evaluate((form) => form.submit());

        await expect(page.getByText(/there are not enough available slots for that request/i)).toBeVisible();
    });

    test("BOOK-NEG-005 - attempting to register twice redirects to Update Seats", async ({ page }) => {
        const event = await createEventAsAdmin(page, {
            title: `PW Duplicate Booking Event ${Date.now()}`,
            date: "2026-06-02",
            location: "Kingston Waterfront Market Square",
            category: "Food",
            image: "https://example.com/duplicate-booking-event.jpg",
            description: "Dedicated duplicate-registration event for BOOK-NEG-005.",
            availableSlots: 20,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Book Neg User 5",
            email: uniqueEmail("bookneg5"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        const eventId = await getEventIdByTitle(page, event.title);
        await goto(page, `/events/${eventId}/register`);

        await expect(page).toHaveURL(/\/events\/registrations\/[a-f0-9]{24}\/edit\?message=/i);
        await expect(page.getByText(/you already joined this event\. update your seats here\./i)).toBeVisible();
    });
});
