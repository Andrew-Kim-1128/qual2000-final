import { test, expect } from "@playwright/test";
import {
    goto,
    adminEventRow,
    createEventAsAdmin,
    deleteEventAsAdmin,
    registerUser,
    uniqueEmail,
} from "./helpers/eventHub.helpers.js";

test.describe("Admin Delete Event", () => {
    let title = "";

    test.beforeEach(async ({ page }) => {
        title = (await createEventAsAdmin(page)).title;
    });

    test("ADMDEL-POS-001 - event is deleted", async ({ page }) => {
        await deleteEventAsAdmin(page, title);
    });

    test("ADMDEL-POS-002 - deleted event not visible", async ({ page }) => {
        await deleteEventAsAdmin(page, title);

        const row = await page.locator("tr").filter({ hasText: title });
        await expect(row).toHaveCount(0);
    });

    test("ADMDEL-POS-003 - deleted event is not visible on public site", async ({ page }) => {
        await goto(page, "/events");

        let anchor = await page.getByRole("link").filter({ hasText: title }).first();
        const url = await anchor.getAttribute("href");

        await deleteEventAsAdmin(page, title);

        await goto(page, "/events");

        anchor = await page.getByRole("link").filter({ hasText: title });
        await expect(anchor).toHaveCount(0);

        await goto(page, url);

        await expect(page.getByText(/That page is not part of Event Hub/)).toBeDefined();
    });

    test("ADMDEL-POS-004 - deleted event is not visible on registrations", async ({ page }) => {
        await goto(page, "/events");

        let anchor = await page.getByRole("link").filter({ hasText: title }).first();
        const url = await anchor.getAttribute("href");

        const user = await registerUser(page, {
            name: "Login User",
            email: uniqueEmail("login"),
            password: "1234",
        });

        await goto(page, url);

        await page.getByRole("link", { name: "Register For This Event" }).click();

        await page.locator(`form[action="${url}/register"]`).evaluate((form) => form.submit());

        await expect(page.getByText(title)).toBeDefined();

        await deleteEventAsAdmin(page, title);

        await goto(page, "/events/registrations");

        const row = await page.locator("tr").filter({ hasText: title });
        await expect(row).toHaveCount(0);
    });
});
