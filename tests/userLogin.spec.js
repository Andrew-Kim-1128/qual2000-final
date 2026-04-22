import { test, expect } from "@playwright/test";

test.describe("login-pos: valid user login", () => {
    test("existing user can login successfully", async ({ page }) => {
        await page.goto("http://localhost:3000/");
        await page.getByRole("link", { name: "Log In", exact: true }).click();
        await page.getByRole("textbox", { name: "Email Address" }).click();
        await page.getByRole("textbox", { name: "Email Address" }).fill("jason@email.com");
        await page.getByRole("textbox", { name: "Password" }).click();
        await page.getByRole("textbox", { name: "Password" }).fill("ryan");
        await page.getByRole("button", { name: "Log In" }).click();
        await expect(page.getByText("You are now logged in.")).toBeVisible();
    });
});

test.describe("login-neg: prevent logging in while logged in", () => {
    test.use({ storageState: "playwright/.auth/user.json" });
    test("logged in user is redirected away from login page", async ({ page }) => {
        await page.goto("/login");
        await expect(page).toHaveURL(/\/events\/registrations/);
        await expect(page.getByText("My saved events")).toBeVisible();
    });
});

test.describe("logout / public access", () => {
    test("auth-001: logout", async ({ page }) => {
        const email = `logout_${Date.now()}@example.com`;

        await page.goto("/register");
        await page.getByLabel(/full name/i).fill("Logout User");
        await page.getByLabel(/email address/i).fill(email);
        await page.locator("#password").fill("1234");
        await page.getByRole("button", { name: /create account/i }).click();
        await expect(page).toHaveURL(/\/events\/registrations/);
        await expect(page.getByRole("navigation").getByRole("button", { name: "Log Out" })).toBeVisible();
        await page.getByRole("navigation").getByRole("button", { name: "Log Out" }).click();
        await expect(page).toHaveURL(/\/login\?message=/);
        await expect(page.getByText("You have been logged out.")).toBeVisible();
    });
});

test.describe("logout / protected route access", () => {
    test("AUTH-002: logged-out user opening /events/registrations is redirected to login", async ({ page }) => {
        await page.goto("/events/registrations");
        await expect(page).toHaveURL(/\/login\?message=/);
        await expect(page.getByText(/please log in to continue/i)).toBeVisible();
    });

    test("AUTH-003: logged-out user opening /events/registrations/calendar is redirected to login", async ({
        page,
    }) => {
        await page.goto("/events/registrations/calendar");
        await expect(page).toHaveURL(/\/login\?message=/);
        await expect(page.getByText(/please log in to continue/i)).toBeVisible();
    });

    test("AUTH-004: logged-out user opening an event registration form is redirected to login", async ({ page }) => {
        await page.goto("/events");
        const firstEventLink = page.locator("a.event-card-link").first();
        if ((await firstEventLink.count()) === 0) {
            test.skip(true, "No seeded events were available to test the registration form route.");
        }
        const eventHref = await firstEventLink.getAttribute("href");
        expect(eventHref).not.toBeNull();
        const eventId = eventHref.split("/").pop();
        await page.goto(`/events/${eventId}/register`);
        await expect(page).toHaveURL(/\/login\?message=/);
        await expect(page.getByText(/please log in to continue/i)).toBeVisible();
    });
});
