import { test, expect } from "@playwright/test";
import {
    SEEDED_EVENTS,
    createEventAsAdmin,
    disableHtmlValidation,
    goto,
    loginUser,
    logoutAdmin,
    openEditSeatsForEvent,
    openEventFromDirectory,
    registerFreshUserForEvent,
    registerUser,
    uniqueEmail,
} from "./helpers/eventHub.helpers.js";

test.describe("Update seats", () => {
    test("EDIT-POS-001 - Edit Seats opens the update form with current values", async ({ page }) => {
        await registerFreshUserForEvent(page, {
            name: "Edit Pos User 1",
            email: uniqueEmail("editpos1"),
            password: "1234",
            eventTitle: SEEDED_EVENTS.SPRING_MUSIC,
            seatCount: 2,
        });

        await openEditSeatsForEvent(page, SEEDED_EVENTS.SPRING_MUSIC);
        // The summary values live inside the details panel
        const registrationDetails = page.locator(".detail-panel").first();

        await expect(registrationDetails).toContainText(/current seats\s*2/i);
        await expect(registrationDetails).toContainText(/maximum allowed right now/i);
        await expect(page.getByLabel(/seat count/i)).toHaveValue("2");
    });

    test("EDIT-POS-002 - changing to another valid seat count is accepted", async ({ page }) => {
        await registerFreshUserForEvent(page, {
            name: "Edit Pos User 2",
            email: uniqueEmail("editpos2"),
            password: "1234",
            eventTitle: SEEDED_EVENTS.SPRING_MUSIC,
            seatCount: 2,
        });

        await openEditSeatsForEvent(page, SEEDED_EVENTS.SPRING_MUSIC);
        await page.getByLabel(/seat count/i).fill("4");
        await expect(page.getByLabel(/seat count/i)).toHaveValue("4");
    });

    test("EDIT-POS-003 - submitting a valid update refreshes My Events and availability", async ({ page }) => {
        // Isolate this test from shared seeded inventory so the restored availability stays deterministic
        const event = await createEventAsAdmin(page, {
            title: `PW Edit Event ${Date.now()}`,
            date: "2026-05-20",
            location: "Innovation Hub, Kingston",
            category: "Workshop",
            image: "https://example.com/edit-event.jpg",
            description: "Dedicated event for EDIT-POS-003.",
            availableSlots: 30,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Edit Pos User 3",
            email: uniqueEmail("editpos3"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        await openEditSeatsForEvent(page, event.title);
        await page.getByLabel(/seat count/i).fill("5");
        await page.getByRole("button", { name: /save seat changes/i }).click();

        await expect(page).toHaveURL(/\/events\/registrations\?message=/);
        await expect(page.getByText(/registration updated successfully/i)).toBeVisible();

        const row = page.locator("tr").filter({ hasText: event.title }).first();
        await expect(row).toContainText("5");

        await openEventFromDirectory(page, event.title);
        await expect(page.getByRole("complementary")).toContainText(/available slots\s*25/i);
    });

    test("EDIT-POS-004 - updated seat counts stay in sync across My Events, My Calendar, Update Seats, and the event detail page", async ({
        page,
    }) => {
        // This flow checks four surfaces, so it uses a dedicated event
        const event = await createEventAsAdmin(page, {
            title: `PW Sync Event ${Date.now()}`,
            date: "2026-06-02",
            location: "Kingston Waterfront Market Square",
            category: "Food",
            image: "https://example.com/sync-event.jpg",
            description: "Dedicated event for EDIT-POS-004.",
            availableSlots: 200,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Edit Pos User 4",
            email: uniqueEmail("editpos4"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        await openEditSeatsForEvent(page, event.title);
        await page.getByLabel(/seat count/i).fill("4");
        await page.getByRole("button", { name: /save seat changes/i }).click();

        const row = page.locator("tr").filter({ hasText: event.title }).first();
        await expect(row).toContainText("4");

        await goto(page, "/events/registrations/calendar");
        const agendaCard = page.locator(".agenda-card").filter({ hasText: event.title }).first();
        await expect(agendaCard).toBeVisible();
        await expect(agendaCard).toContainText(/seats:\s*4/i);

        await openEditSeatsForEvent(page, event.title);
        await expect(page.locator(".detail-panel").first()).toContainText(/current seats\s*4/i);

        await openEventFromDirectory(page, event.title);
        await expect(page.getByRole("complementary")).toContainText(
            /you already have\s*4\s*seat\(s\)\s*saved for this event/i,
        );
    });
});

test.describe("Invalid update seats", () => {
    test("EDIT-NEG-001 - seat count of 0 is rejected on the update form", async ({ page }) => {
        await registerFreshUserForEvent(page, {
            name: "Edit Neg User 1",
            email: uniqueEmail("editneg1"),
            password: "1234",
            eventTitle: SEEDED_EVENTS.SPRING_MUSIC,
            seatCount: 2,
        });

        await openEditSeatsForEvent(page, SEEDED_EVENTS.SPRING_MUSIC);
        await disableHtmlValidation(page);
        await page.getByLabel(/seat count/i).fill("0");
        // Submit the actual PATCH form directly so the server-side validation message is rendered
        await page.locator('form[action*="_method=PATCH"]').evaluate((form) => form.submit());

        await expect(page.getByText(/please choose a whole number of seats between 1 and 10/i)).toBeVisible();
    });

    test("EDIT-NEG-002 - seat count above 10 is rejected on the update form", async ({ page }) => {
        await registerFreshUserForEvent(page, {
            name: "Edit Neg User 2",
            email: uniqueEmail("editneg2"),
            password: "1234",
            eventTitle: SEEDED_EVENTS.SPRING_MUSIC,
            seatCount: 2,
        });

        await openEditSeatsForEvent(page, SEEDED_EVENTS.SPRING_MUSIC);
        await disableHtmlValidation(page);
        await page.getByLabel(/seat count/i).fill("11");
        await page.locator('form[action*="_method=PATCH"]').evaluate((form) => form.submit());

        await expect(page.getByText(/please choose a whole number of seats between 1 and 10/i)).toBeVisible();
    });

    test("EDIT-NEG-003 - seat count above the recalculated maximum is rejected", async ({ page }) => {
        const event = await createEventAsAdmin(page, {
            title: `PW Tiny Edit Event ${Date.now()}`,
            date: "2026-08-25",
            availableSlots: 3,
        });
        await logoutAdmin(page);

        await registerFreshUserForEvent(page, {
            name: "Edit Neg User 3",
            email: uniqueEmail("editneg3"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        await openEditSeatsForEvent(page, event.title);
        await disableHtmlValidation(page);
        await page.getByLabel(/seat count/i).fill("4");
        await page.locator('form[action*="_method=PATCH"]').evaluate((form) => form.submit());

        await expect(page.getByText(/there are not enough available slots for that request/i)).toBeVisible();
    });

    test("EDIT-NEG-004 - a user cannot open another user's edit route", async ({ browser }) => {
        const ownerContext = await browser.newContext();
        const ownerPage = await ownerContext.newPage();

        const intruderContext = await browser.newContext();
        const intruderPage = await intruderContext.newPage();

        const event = await createEventAsAdmin(ownerPage, {
            title: `PW Protected Edit Event ${Date.now()}`,
            date: "2026-06-18",
            location: "Grand Theatre Gallery, Kingston",
            category: "Art",
            image: "https://example.com/protected-edit-event.jpg",
            description: "Dedicated event for EDIT-NEG-004.",
            availableSlots: 60,
        });
        await logoutAdmin(ownerPage);

        await registerFreshUserForEvent(ownerPage, {
            name: "Owner User",
            email: uniqueEmail("owner"),
            password: "1234",
            eventTitle: event.title,
            seatCount: 2,
        });

        await goto(ownerPage, "/events/registrations");
        const row = ownerPage.locator("tr").filter({ hasText: event.title }).first();
        const editHref = await row.getByRole("link", { name: /edit seats/i }).getAttribute("href");

        await registerUser(intruderPage, {
            name: "Intruder User",
            email: uniqueEmail("intruder"),
            password: "1234",
        });

        await goto(intruderPage, editHref);
        await expect(intruderPage).toHaveURL(/\/events\/registrations\?message=/);
        await expect(intruderPage.getByText(/that registration could not be found/i)).toBeVisible();

        await ownerContext.close();
        await intruderContext.close();
    });
});
