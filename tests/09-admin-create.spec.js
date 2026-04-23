import { test, expect } from "@playwright/test";
import {
    goto,
    loginAdmin,
    logoutAdmin,
    fillAdminEventForm,
    createEventAsAdmin,
    deleteEventAsAdmin,
} from "./helpers/eventHub.helpers.js";

test.describe("Admin Create Event", () => {
    test("ADMCRT-POS-001 - New Event page loads", async ({ page }) => {
        await loginAdmin(page);
        await page.getByRole("link", { name: /add new event/i }).click();
        await expect(page).toHaveURL(/\/admin\/events\/new$/);
    });

    test("ADMCRT-POS-002 - form accepts all values", async ({ page }) => {
        const event = {
            title: "QA Demo Event",
            date: "2026-09-15",
            location: "Test Hall",
            category: "Workshop",
            image: "https://example.com/generated-event.jpg",
            description: "test description",
            availableSlots: "25",
        };

        await loginAdmin(page);

        await goto(page, "/admin/events/new");
        await expect(page).toHaveURL(/\/admin\/events\/new$/);

        await fillAdminEventForm(page, event);

        await expect(page.getByLabel(/event title/i)).toHaveValue(event.title);
        await expect(page.getByLabel(/event date/i)).toHaveValue(event.date);
        await expect(page.getByLabel(/location/i)).toHaveValue(event.location);
        await expect(page.getByLabel(/category/i)).toHaveValue(event.category);
        await expect(page.getByLabel(/image url/i)).toHaveValue(event.image);
        await expect(page.getByLabel(/description/i)).toHaveValue(event.description);
        await expect(page.getByLabel(/available slots/i)).toHaveValue(event.availableSlots);
    });

    test("ADMCRT-POS-003 - event is created", async ({ page }) => {
        const event = await createEventAsAdmin(page);

        await deleteEventAsAdmin(page, event.title);
    });

    test("ADMCRT-POS-004 - new event is visible on public site", async ({ page }) => {
        const event = await createEventAsAdmin(page);

        await expect(page.getByText(event.title)).toBeDefined();

        await goto(page, "/events");

        const anchor = await page.getByRole("link").filter({ hasText: event.title }).first();

        await expect(anchor).toBeDefined();

        const url = await anchor.getAttribute("href");

        anchor.click();

        await expect(page).toHaveURL(new RegExp(url));
        await expect(page.getByText(event.description)).toBeDefined();
        await expect(page.getByText(/Log In To Register/)).toBeDefined();

        await deleteEventAsAdmin(page, event.title);
    });
});

test.describe("Invalid Admin Create Event", () => {
    test("ADMCRT-NEG-001 - blank fields are rejected", async ({ page }) => {
        await loginAdmin(page);
        await goto(page, "/admin/events/new");

        await page.getByRole("button", { name: "Create Event" }).click();

        await expect(page).toHaveURL(/\/admin\/events\/new$/);

        const validationMessage = await page
            .getByRole("textbox", { name: "Event Title" })
            .evaluate((e) => e.validationMessage);

        await expect(["Please fill out this field.", "Fill out this field"]).toContain(validationMessage);
    });

    test("ADMCRT-NEG-002 - negative Available Slots are regected", async ({ page }) => {
        const event = {
            title: "QA Demo Event",
            date: "2026-09-15",
            location: "Test Hall",
            category: "Workshop",
            image: "https://example.com/generated-event.jpg",
            description: "test description",
            availableSlots: "-1",
        };

        await loginAdmin(page);
        await goto(page, "/admin/events/new");

        await fillAdminEventForm(page, event);

        await page.getByRole("button", { name: "Create Event" }).click();

        await expect(page).toHaveURL(/\/admin\/events\/new$/);

        const validationMessage = await page
            .getByRole("spinbutton", { name: "Available Slots" })
            .evaluate((e) => e.validationMessage);

        await expect([
            "Value must be greater than or equal to 0.",
            "Please select a value that is no less than 0.",
            "range underflow",
        ]).toContain(validationMessage);
    });

    test("ADMCRT-NEG-003 - access violation rejected", async ({ page }) => {
        await goto(page, "/admin/events/new");
        await expect(page).toHaveURL(/\/admin\/login$/);
    });

    test("ADMCRT-NEG-004 - past dates rejected", async ({ page }) => {
        const event = {
            title: "QA Demo Event",
            date: "2025-09-15",
            location: "Test Hall",
            category: "Workshop",
            image: "https://example.com/generated-event.jpg",
            description: "test description",
            availableSlots: "25",
        };

        await loginAdmin(page);
        await goto(page, "/admin/events/new");

        await fillAdminEventForm(page, event);

        await page.getByRole("button", { name: "Create Event" }).click();

        await expect(page).toHaveURL(/\/admin\/events\/new$/);
    });

    test("ADMCRT-NEG-005 - duplicate event rejected", async ({ page }) => {
        const event = await createEventAsAdmin(page);

        await goto(page, "/admin/events/new");

        await fillAdminEventForm(page, event);

        await page.getByRole("button", { name: "Create Event" }).click();

        await expect(page).toHaveURL(/\/admin\/events\/new$/);

        await deleteEventAsAdmin(page, event.title);
    });
});
