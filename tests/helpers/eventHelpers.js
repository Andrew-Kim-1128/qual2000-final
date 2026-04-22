import { expect } from "@playwright/test";

export async function createNewUser(page) {
    const email = `testUser_${Date.now()}_${Math.random().toString(36).substring(2)}@example.com`;

    await page.goto("/register");
    await page.getByLabel(/full name/i).fill("testUser");
    await page.getByLabel(/email address/i).fill(email);
    await page.locator("#password").fill("1234");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/events\/registrations/);
}

export async function openEvent(page, title) {
    await page.goto("/events");
    await page
        .getByRole("link", { name: new RegExp(title) })
        .first()
        .click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
}
