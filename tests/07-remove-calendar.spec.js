import { test, expect } from "@playwright/test";
import {
    SEEDED_EVENTS,
    createEventAsAdmin,
    ensureBaselinePublicEvents,
    createPastAndFutureEvents,
    goto,
    logoutAdmin,
    openEventFromDirectory,
    registerForEvent,
    registerFreshUserForEvent,
    uniqueEmail,
} from "./helpers/eventHub.helpers.js";

test.describe("Remove registration", () => {
    test.beforeEach(async ({ page }) => {
        await ensureBaselinePublicEvents(page);
    });

    test("DEL-POS-001 - Remove Event deletes the registration and shows a success message", async ({ page }) => {
        // Use a dedicated event so deletion checks do not depend on shared seeded capacity
        const event = await createEventAsAdmin(page, {
            title: `PW Delete Event ${Date.now()}`,
            date: "2026-05-14",
            location: "Confederation Park, Kingston",
            category: "Music",
            image: "https://example.com/delete-event.jpg",
            description: "Dedicated event for DEL-POS-001.",
            availableSlots: 20,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Delete User 1",
            email: uniqueEmail("del1"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        await goto(page, "/events/registrations");
        const row = page.locator("tr").filter({ hasText: event.title }).first();
        await row.getByRole("button", { name: /remove event/i }).click();

        await expect(page).toHaveURL(/\/events\/registrations\?message=/);
        await expect(page.getByText(/registration removed from your calendar/i)).toBeVisible();
    });

    test("DEL-POS-002 - after deletion, My Events loses the row and availability is restored", async ({ page }) => {
        const event = await createEventAsAdmin(page, {
            title: `PW Remove Event ${Date.now()}`,
            date: "2026-05-20",
            location: "Innovation Hub, Kingston",
            category: "Workshop",
            image: "https://example.com/remove-event.jpg",
            description: "Dedicated event for DEL-POS-002.",
            availableSlots: 30,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Delete User 2",
            email: uniqueEmail("del2"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        await goto(page, "/events/registrations");
        const row = page.locator("tr").filter({ hasText: event.title }).first();
        await row.getByRole("button", { name: /remove event/i }).click();

        await expect(page.locator("tr").filter({ hasText: event.title })).toHaveCount(0);

        await openEventFromDirectory(page, event.title);
        await expect(page.getByRole("complementary")).toContainText(/available slots\s*30/i);
    });

    test("DEL-POS-003 - after deletion, the event detail page offers Register For This Event again", async ({
        page,
    }) => {
        await registerFreshUserForEvent(page, {
            name: "Delete User 3",
            email: uniqueEmail("del3"),
            password: "1234",
            eventTitle: SEEDED_EVENTS.FOOD_MARKET,
            seatCount: 1,
        });

        await goto(page, "/events/registrations");
        const row = page.locator("tr").filter({ hasText: SEEDED_EVENTS.FOOD_MARKET }).first();
        await row.getByRole("button", { name: /remove event/i }).click();

        await openEventFromDirectory(page, SEEDED_EVENTS.FOOD_MARKET);
        await expect(page.getByRole("link", { name: /register for this event/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /update my seats/i })).toHaveCount(0);
    });
});

test.describe("Calendar and agenda views", () => {
    test.beforeEach(async ({ page }) => {
        await ensureBaselinePublicEvents(page);
    });

    test("CAL-001 - My Calendar shows the month heading, toolbar, grid, and agenda", async ({ page }) => {
        // Give the calendar page a stable registration in the month we expect to inspect
        const event = await createEventAsAdmin(page, {
            title: `PW Calendar Event ${Date.now()}`,
            date: "2026-05-14",
            location: "Confederation Park, Kingston",
            category: "Music",
            image: "https://example.com/calendar-event.jpg",
            description: "Dedicated event for CAL-001.",
            availableSlots: 20,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Calendar User 1",
            email: uniqueEmail("cal1"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        await goto(page, "/events/registrations/calendar");

        await expect(page.getByRole("heading", { level: 1 })).toContainText(/see your saved events in one calendar/i);
        await expect(page.locator(".calendar-toolbar").getByRole("heading", { level: 2 })).toBeVisible();
        await expect(page.getByRole("link", { name: /previous month/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /current month/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /next month/i })).toBeVisible();
        await expect(page.getByText("Agenda", { exact: true })).toBeVisible();
        await expect(
            page.getByRole("heading", { level: 2, name: /review upcoming plans and past events in order/i }),
        ).toBeVisible();
    });

    test("CAL-002 - Previous Month, Current Month, and Next Month change the month heading", async ({ page }) => {
        const event = await createEventAsAdmin(page, {
            title: `PW Calendar Nav Event ${Date.now()}`,
            date: "2026-05-14",
            location: "Confederation Park, Kingston",
            category: "Music",
            image: "https://example.com/calendar-nav-event.jpg",
            description: "Dedicated event for CAL-002.",
            availableSlots: 20,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Calendar User 2",
            email: uniqueEmail("cal2"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        await goto(page, "/events/registrations/calendar");
        // Scope the month assertion to the toolbar heading
        const heading = page.locator(".calendar-toolbar").getByRole("heading", { level: 2 });
        const initialMonth = await heading.textContent();

        await page.getByRole("link", { name: /next month/i }).click();
        await expect(heading).not.toHaveText(initialMonth || "");
        const nextMonth = await heading.textContent();

        await page.getByRole("link", { name: /current month/i }).click();
        await expect(heading).not.toHaveText(initialMonth || "");
        const currentMonth = await heading.textContent();

        await page.getByRole("link", { name: /previous month/i }).click();
        await expect(heading).not.toHaveText(currentMonth || "");
        await expect(heading).toHaveText(initialMonth || "");
    });

    test("CAL-003 - a day cell with a saved event links to the Update Seats page", async ({ page }) => {
        // Use an April event so the day-cell link appears on the default loaded month
        const event = await createEventAsAdmin(page, {
            title: `PW Calendar Cell Event ${Date.now()}`,
            date: "2026-04-24",
            location: "Innovation Hub, Kingston",
            category: "Workshop",
            image: "https://example.com/calendar-cell-event.jpg",
            description: "Dedicated event for CAL-003.",
            availableSlots: 20,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Calendar User 3",
            email: uniqueEmail("cal3"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 3,
        });

        await goto(page, "/events/registrations/calendar");
        const calendarLink = page
            .getByRole("link", {
                name: new RegExp(`${event.title}.*3 seat\\(s\\)`, "i"),
            })
            .first();

        await expect(calendarLink).toBeVisible();
        await calendarLink.click();

        await expect(page).toHaveURL(/\/events\/registrations\/[a-f0-9]{24}\/edit$/i);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(/adjust your seats/i);
    });

    test("CAL-004 - agenda shows upcoming and past events in their respective sections", async ({ page }) => {
        const { pastEvent, futureEvent } = await createPastAndFutureEvents(page);

        await registerFreshUserForEvent(page, {
            name: "Calendar User 4",
            email: uniqueEmail("cal4"),
            password: "1234",
            eventTitle: pastEvent.title,
            seatCount: 1,
        });

        await registerForEvent(page, {
            eventTitle: futureEvent.title,
            seatCount: 2,
        });

        await goto(page, "/events/registrations/calendar");
        // Check the exact agenda columns instead of broad page text to avoid duplicate matches
        await expect(page.getByRole("heading", { level: 3, name: "Upcoming" })).toBeVisible();
        await expect(page.getByRole("heading", { level: 3, name: "Past Events" })).toBeVisible();
        await expect(
            page.locator(".agenda-column").first().getByRole("link", { name: futureEvent.title, exact: true }),
        ).toBeVisible();
        await expect(
            page.locator(".agenda-column").nth(1).getByRole("link", { name: pastEvent.title, exact: true }),
        ).toBeVisible();
    });
});
