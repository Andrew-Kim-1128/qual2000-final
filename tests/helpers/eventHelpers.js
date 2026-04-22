import { expect } from "@playwright/test";
import crypto from "node:crypto";

export async function createNewUser(page) {
    const email = `testuser_${Date.now()}_${crypto.randomUUID()}@example.com`;

    await page.goto("/register");
    await page.getByLabel(/full name/i).fill("testUser");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/password/i).fill("1234");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/events\/registrations/);
}

export async function openEvent(page, title) {
    await page.goto("/events");

    const eventCard = page.locator("a.event-card-link").filter({ hasText: title }).first();
    await expect(eventCard).toBeVisible();

    await eventCard.click();

    await expect(page).toHaveURL(/\/events\/[a-f0-9]{24}$/i);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
}
