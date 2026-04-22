import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

async function ensureEvent(page, event) {
    await page.goto("http://localhost:3000/admin/events");

    const existingEvent = page.getByRole("link", {
        name: new RegExp(`^${event.title}$`),
    });

    if ((await existingEvent.count()) > 0) {
        return;
    }

    await page.goto("http://localhost:3000/admin/events/new");
    await page.getByLabel(/event title/i).fill(event.title);
    await page.getByLabel(/event date/i).fill(event.date);
    await page.getByLabel(/^location$/i).fill(event.location);
    await page.getByLabel(/category/i).fill(event.category);
    await page.getByLabel(/image url/i).fill(event.image);
    await page.getByLabel(/description/i).fill(event.description);
    await page.getByLabel(/available slots/i).fill(String(event.availableSlots));
    await page.getByRole("button", { name: /create event/i }).click();

    await page.waitForURL(/\/admin\/events/);
}

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

        const openEvent = {
            title: "TestOpenEvent",
            date: "2026-08-15",
            location: "Kingston",
            category: "testing",
            image: "https://www.english-efl.com/wp-content/uploads/2019/12/test.jpg",
            description: "Playwright test event description.",
            availableSlots: 8,
        };

        const fullEvent = {
            title: "TestFullEvent",
            date: "2026-08-15",
            location: "Kingston",
            category: "testing",
            image: "https://www.english-efl.com/wp-content/uploads/2019/12/test.jpg",
            description: "Playwright full event description.",
            availableSlots: 0,
        };

        await ensureEvent(page, openEvent);
        await ensureEvent(page, fullEvent);

        await page.close();
    }

    await browser.close();
}
