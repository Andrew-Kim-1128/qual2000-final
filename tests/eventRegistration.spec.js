import { test, expect } from "@playwright/test";

// ----- positive event registration/ directory -----
test.describe("events-logged-out", () => {
    test("event-001/event-002", async ({ page }) => {
        await page.goto("/events");
        const eventCards = page.locator("a.event-card-link");
        await expect(eventCards.first()).toBeVisible();
    });

    test("event-003", async ({ page }) => {
        await page.goto("/events");
        const firstEventLink = page.locator("a.event-card-link").first();
        await expect(firstEventLink).toBeVisible();
        const eventTitle = (await firstEventLink.locator(".event-title").innerText()).trim();
        await firstEventLink.click();
        await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible();
        await expect(page.locator(".detail-copy")).toBeVisible();
        await expect(page.getByText("Location")).toBeVisible();
        await expect(page.getByText("Date")).toBeVisible();
        await expect(page.getByText("Available Slots")).toBeVisible();
        await expect(page.locator(".detail-meta .meta-pill").first()).toBeVisible();
    });

    test("event-004", async ({ page }) => {
        await page.goto("/events");
        const firstEventLink = page.locator("a.event-card-link").first();
        await expect(firstEventLink).toBeVisible();
        await firstEventLink.click();
        const aside = page.getByRole("complementary");
        await expect(aside.getByRole("link", { name: "Log In To Register" })).toBeVisible();
        await expect(aside.getByRole("link", { name: "Create Account" })).toBeVisible();
        await expect(aside.getByRole("link", { name: "Back To Events" })).toBeVisible();
    });
});

test.describe("event detail actions", () => {
    test("EVENT-005/book-pos-001: logged-in user with no registration sees register actions", async ({ page }) => {
        // create fresh user
        const email = `event005_${Date.now()}@example.com`;
        await page.goto("/register");
        await page.getByLabel(/full name/i).fill("Event Five User");
        await page.getByLabel(/email address/i).fill(email);
        await page.locator("#password").fill("1234");
        await page.getByRole("button", { name: /create account/i }).click();
        await expect(page).toHaveURL(/\/events\/registrations/);
        await page.goto("/events");

        const eventCards = page.locator("a.event-card-link");
        const total = await eventCards.count();
        let chosenCard = null;

        // find event with available spots in db
        for (let i = 0; i < total; i++) {
            const card = eventCards.nth(i);
            const text = await card.innerText();

            if (!/available slots:\s*0/i.test(text)) {
                chosenCard = card;
                break;
            }
        }

        test.skip(!chosenCard, "No event with available slots was found.");
        if (!chosenCard) return;
        // check for action buttons on card
        await chosenCard.click();
        await expect(page.getByRole("link", { name: "Register For This Event" })).toBeVisible();
        await expect(page.getByRole("link", { name: "View My Events" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Back To Events" })).toBeVisible();
    });

    test("EVENT-006/book-pos-002 to book-pos-004: existing registration changes event detail", async ({ page }) => {
        // create fresh user
        const email = `event006_${Date.now()}@example.com`;
        await page.goto("/register");
        await page.getByLabel(/full name/i).fill("Event Six User");
        await page.getByLabel(/email address/i).fill(email);
        await page.locator("#password").fill("1234");
        await page.getByRole("button", { name: /create account/i }).click();
        await expect(page).toHaveURL(/\/events\/registrations/);
        await page.goto("/events");
        const eventCards = page.locator("a.event-card-link");
        const total = await eventCards.count();
        let chosenCard = null;
        let chosenHref = null;

        // find event in db with available slots
        for (let i = 0; i < total; i++) {
            const card = eventCards.nth(i);
            const text = await card.innerText();

            if (!/available slots:\s*0/i.test(text)) {
                chosenCard = card;
                chosenHref = await card.getAttribute("href");
                break;
            }
        }

        test.skip(!chosenCard || !chosenHref, "No event with available slots was found.");
        if (!chosenCard || !chosenHref) return;

        // register and check outcome
        await chosenCard.click();
        await expect(page.getByRole("link", { name: "Register For This Event" })).toBeVisible();
        await page.getByRole("link", { name: "Register For This Event" }).click();
        await expect(page).toHaveURL(/\/register$/);
        await page.getByLabel(/seat count/i).fill("2");
        await page.getByRole("button", { name: /add to my calendar/i }).click();
        await expect(page).toHaveURL(/\/events\/registrations/);
        await page.goto(chosenHref);
        await expect(page.getByRole("link", { name: "Update My Seats" })).toBeVisible();
        await expect(page.getByRole("link", { name: "View My Calendar" })).toBeVisible();
        await expect(page.getByText(/you already have/i)).toBeVisible();
        await expect(page.getByText(/2/)).toBeVisible();
        await expect(page.getByRole("link", { name: "Register For This Event" })).toHaveCount(0);
    });
});

test.describe("events-logged-in-full", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test("event-007: event full", async ({ page }) => {
        await page.goto("/events");
        const eventCards = page.locator("a.event-card-link");
        const total = await eventCards.count();
        let fullEventCard = null;

        // check for full events
        for (let i = 0; i < total; i++) {
            const card = eventCards.nth(i);
            const text = await card.innerText();

            if (/available slots:\s*0/i.test(text)) {
                fullEventCard = card;
                break;
            }
        }

        test.skip(!fullEventCard, "No full event was found in the current database.");
        if (!fullEventCard) return;

        // if full event found
        await fullEventCard.click();
        await expect(page.getByText("This event is full")).toBeVisible();
        await expect(page.getByRole("link", { name: "Back To Events" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Register For This Event" })).toHaveCount(0);
    });
});

// ----- negative event registration -----
