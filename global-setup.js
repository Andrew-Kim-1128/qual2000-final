import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

export default async function globalSetup() {
    const authDir = path.join("playwright", ".auth");

    if (!fs.existsSync("playwright")) {
        fs.mkdirSync("playwright");
    }

    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir);
    }

    const browser = await chromium.launch();

    // User auth state
    {
        const page = await browser.newPage();
        const email = `eventhub_${Date.now()}@example.com`;
        await page.goto("http://localhost:3000/register");
        await page.getByLabel(/full name/i).fill("Playwright User");
        await page.getByLabel(/email address/i).fill(email);
        await page.locator("#password").fill("1234");
        await page.getByRole("button", { name: /create account/i }).click();
        await page.context().storageState({ path: "playwright/.auth/user.json" });
        await page.close();
    }

    // Admin auth state
    {
        const page = await browser.newPage();
        await page.goto("http://localhost:3000/admin/login");
        await page.getByLabel(/admin username/i).fill("admin");
        await page.getByLabel(/admin password/i).fill("1234");
        await page.getByRole("button", { name: /sign in/i }).click();
        await page.context().storageState({ path: "playwright/.auth/admin.json" });
        await page.close();
    }

    await browser.close();
}
