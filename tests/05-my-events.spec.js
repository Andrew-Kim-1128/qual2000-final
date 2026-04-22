import { test, expect } from "@playwright/test";
import {
    SEEDED_EVENTS,
    goto,
    registerFreshUserForEvent,
    registerUser,
    uniqueEmail,
} from "./helpers/eventHub.helpers.js";

test.describe("My Events page", () => {
    test("MYEV-001 - populated My Events shows registration data in the table", async ({ page }) => {
        await registerFreshUserForEvent(page, {
            name: "My Events User 1",
            email: uniqueEmail("myev1"),
            password: "1234",
            eventTitle: SEEDED_EVENTS.SPRING_MUSIC,
            seatCount: 2,
        });

        await goto(page, "/events/registrations");
        // Filter down to the specific registration row before checking status and timing labels
        const row = page.locator("tr").filter({ hasText: SEEDED_EVENTS.SPRING_MUSIC }).first();

        await expect(page.getByRole("heading", { level: 1 })).toContainText(
            /track and manage the events on your calendar/i,
        );
        await expect(row).toBeVisible();
        await expect(row).toContainText(/confirmed/i);
        await expect(row).toContainText(/upcoming|past event/i);
    });

    test("MYEV-002 - a populated row links back to the event and includes actions", async ({ page }) => {
        await registerFreshUserForEvent(page, {
            name: "My Events User 2",
            email: uniqueEmail("myev2"),
            password: "1234",
            eventTitle: SEEDED_EVENTS.CODING_WORKSHOP,
            seatCount: 1,
        });

        await goto(page, "/events/registrations");
        const row = page.locator("tr").filter({ hasText: SEEDED_EVENTS.CODING_WORKSHOP }).first();

        await expect(row.getByRole("link", { name: new RegExp(SEEDED_EVENTS.CODING_WORKSHOP, "i") })).toBeVisible();
        await expect(row.getByRole("link", { name: /edit seats/i })).toBeVisible();
        await expect(row.getByRole("button", { name: /remove event/i })).toBeVisible();
    });

    test("MYEV-003 - a user with no registrations sees the empty state", async ({ page }) => {
        // Register without booking anything so the empty-state copy is the only meaningful output
        await registerUser(page, {
            name: "My Events Empty User",
            email: uniqueEmail("myevempty"),
            password: "1234",
        });

        await goto(page, "/events/registrations");
        await expect(page.getByText(/your calendar is still empty/i)).toBeVisible();
        await expect(page.getByRole("link", { name: /^browse events$/i })).toBeVisible();
    });
});
