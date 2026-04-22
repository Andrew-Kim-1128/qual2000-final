import { test, expect } from "@playwright/test";
import {
    SEEDED_EVENTS,
    createEventAsAdmin,
    goto,
    logoutAdmin,
    openEventFromDirectory,
    registerFreshUserForEvent,
    uniqueEmail,
} from "./helpers/eventHub.helpers.js";

async function ensureDirectoryBaselineEvents(page) {
    await goto(page, "/events");

    // Create only the missing catalog entries so repeated runs do not duplicate shared fixtures.
    const springMusicLink = page.getByRole("link", {
        name: new RegExp(SEEDED_EVENTS.SPRING_MUSIC, "i"),
    });

    if (await springMusicLink.count()) {
        return;
    }

    await createEventAsAdmin(page, {
        title: SEEDED_EVENTS.SPRING_MUSIC,
        date: "2026-05-14",
        location: "Confederation Park, Kingston",
        category: "Music",
        image: "https://example.com/spring-music.jpg",
        description: "Baseline public music event for directory coverage.",
        availableSlots: 120,
    });

    await createEventAsAdmin(page, {
        title: SEEDED_EVENTS.CODING_WORKSHOP,
        date: "2026-05-20",
        location: "Innovation Hub, Kingston",
        category: "Workshop",
        image: "https://example.com/coding-workshop.jpg",
        description: "Baseline public coding event for directory coverage.",
        availableSlots: 30,
    });

    await logoutAdmin(page);
}

test.describe("Events directory and event details", () => {
    test.beforeEach(async ({ page }) => {
        await ensureDirectoryBaselineEvents(page);
    });

    test("EVENT-001 - /events shows seeded event cards", async ({ page }) => {
        await goto(page, "/events");
        await expect(page.getByRole("heading", { level: 1 })).toContainText(/explore the full event hub lineup/i);
        await expect(
            page.getByRole("link", { name: new RegExp(SEEDED_EVENTS.SPRING_MUSIC, "i") }).first(),
        ).toBeVisible();
        await expect(
            page.getByRole("link", { name: new RegExp(SEEDED_EVENTS.CODING_WORKSHOP, "i") }).first(),
        ).toBeVisible();
    });

    test("EVENT-002 - an event card shows summary content and a working link", async ({ page }) => {
        await goto(page, "/events");
        const cardLink = page.getByRole("link", { name: new RegExp(SEEDED_EVENTS.SPRING_MUSIC, "i") }).first();

        await expect(cardLink).toBeVisible();
        await expect(cardLink).toContainText(/music/i);
        await expect(cardLink).toContainText(/available slots/i);

        await cardLink.click();
        await expect(page.getByRole("heading", { level: 1 })).toContainText(SEEDED_EVENTS.SPRING_MUSIC);
    });

    test("EVENT-003 - clicking an event opens its detail page with full details", async ({ page }) => {
        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);

        await expect(page.getByText(/plan your visit before the tickets are gone/i)).toBeVisible();
        await expect(page.getByText(/location/i)).toBeVisible();
        await expect(page.getByText(/date/i)).toBeVisible();
        await expect(page.getByText(/available slots/i)).toBeVisible();
    });

    test("EVENT-004 - logged-out event detail page shows login and account CTAs", async ({ page }) => {
        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);
        // The detail page and the top nav both contain account links, so scope to the event panel.
        const eventActions = page.getByRole("complementary");

        await expect(eventActions.getByRole("link", { name: /log in to register/i })).toBeVisible();
        await expect(eventActions.getByRole("link", { name: /create account/i })).toBeVisible();
        await expect(eventActions.getByRole("link", { name: /back to events/i })).toBeVisible();
    });

    test("EVENT-005 - logged-in event detail page shows Register, My Events, and Back To Events", async ({ page }) => {
        await goto(page, "/register");
        const email = uniqueEmail("eventdetail");
        await page.getByLabel(/full name/i).fill("Event Detail User");
        await page.getByLabel(/email address/i).fill(email);
        await page.locator("#password").fill("1234");
        await page.getByRole("button", { name: /create account/i }).click();

        await openEventFromDirectory(page, SEEDED_EVENTS.SPRING_MUSIC);

        await expect(page.getByRole("link", { name: /register for this event/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /view my events/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /back to events/i })).toBeVisible();
    });

    test("EVENT-006 - once registered, the event detail page switches to Update My Seats", async ({ page }) => {
        const event = await createEventAsAdmin(page, {
            title: `PW Registered Detail Event ${Date.now()}`,
            date: "2026-05-14",
            location: "Confederation Park, Kingston",
            category: "Music",
            image: "https://example.com/registered-detail-event.jpg",
            description: "Dedicated event for EVENT-006.",
            availableSlots: 120,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Registered Detail User",
            eventTitle: event.title,
            seatCount: 3,
        });

        await openEventFromDirectory(page, event.title);
        // The seat count is split across inline elements, assert against the panel's combined text
        const eventActions = page.getByRole("complementary");

        await expect(eventActions.getByRole("link", { name: /update my seats/i })).toBeVisible();
        await expect(eventActions.getByRole("link", { name: /view my calendar/i })).toBeVisible();
        await expect(eventActions).toContainText(/you already have\s*3\s*seat\(s\)\s*saved for this event/i);
        await expect(eventActions.getByRole("link", { name: /register for this event/i })).toHaveCount(0);
    });

    test("EVENT-007 - a full event shows a full-event indicator and no registration CTA", async ({ page }) => {
        const event = await createEventAsAdmin(page, {
            title: `PW Full Event ${Date.now()}`,
            date: "2026-08-30",
            availableSlots: 0,
        });

        await goto(page, "/");
        await page.getByRole("link", { name: /^home$/i }).click();
        await goto(page, "/register");
        await page.getByLabel(/full name/i).fill("Full Event User");
        await page.getByLabel(/email address/i).fill(uniqueEmail("fullevent"));
        await page.locator("#password").fill("1234");
        await page.getByRole("button", { name: /create account/i }).click();

        await openEventFromDirectory(page, event.title);

        await expect(page.getByText(/this event is full/i)).toBeVisible();
        await expect(page.getByRole("link", { name: /register for this event/i })).toHaveCount(0);
    });
});
