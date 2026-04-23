import { test, expect } from "@playwright/test";
import { BASE_URL, goto, registerUser, uniqueEmail } from "./helpers/eventHub.helpers.js";

test.describe("User registration", () => {
    test("REG-POS-001 - clicking Register opens the registration page", async ({ page }) => {
        await goto(page, "/");
        await page.getByRole("link", { name: /^register$/i }).click();
        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(/register before you start saving events/i);
    });

    test("REG-POS-002 - Full Name accepts user input", async ({ page }) => {
        await goto(page, "/register");
        await page.getByLabel(/full name/i).fill("jason");
        await expect(page.getByLabel(/full name/i)).toHaveValue("jason");
    });

    test("REG-POS-003 - Email Address accepts user input", async ({ page }) => {
        await goto(page, "/register");
        await page.getByLabel(/email address/i).fill("jason@mail.com");
        await expect(page.getByLabel(/email address/i)).toHaveValue("jason@mail.com");
    });

    test("REG-POS-004 - valid registration creates an account and redirects to My Events", async ({ page }) => {
        await registerUser(page, {
            name: "jason",
            email: uniqueEmail("regpos"),
            password: "ryan",
        });

        await expect(page.getByText(/my saved events/i)).toBeVisible();
    });
});

test.describe("Invalid user registration", () => {
    test("REG-NEG-001 - blank registration is blocked on the registration form", async ({ page }) => {
        await goto(page, "/register");
        // Force the request through server-side validation
        await page
            .locator("form")
            .first()
            .evaluate((form) => {
                form.setAttribute("novalidate", "true");
            });

        await page.getByRole("button", { name: /create account/i }).click();

        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByText(/please complete every account field/i)).toBeVisible();
    });

    test("REG-NEG-002 - clicking Create Account opens the registration page", async ({ page }) => {
        await goto(page, "/");
        await page.getByRole("link", { name: /create account/i }).click();
        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(/register before you start saving events/i);
    });

    test("REG-NEG-003 - Email Address can be cleared", async ({ page }) => {
        await goto(page, "/register");
        await page.getByLabel(/email address/i).fill("jason@mail.com");
        await page.getByLabel(/email address/i).clear();
        await expect(page.getByLabel(/email address/i)).toHaveValue("");
    });

    test("REG-NEG-004 - Password can be cleared", async ({ page }) => {
        await goto(page, "/register");
        await page.locator("#password").fill("secret");
        await page.locator("#password").clear();
        await expect(page.locator("#password")).toHaveValue("");
    });

    test("REG-NEG-005 - malformed email text can be entered into the email field", async ({ page }) => {
        await goto(page, "/register");
        await page.getByLabel(/email address/i).fill("jasonmail.com");
        await expect(page.getByLabel(/email address/i)).toHaveValue("jasonmail.com");
    });

    test("REG-NEG-006 - a duplicate email can be entered before submission", async ({ page }) => {
        await goto(page, "/register");
        await page.getByLabel(/email address/i).fill("jason@mail.com");
        await expect(page.getByLabel(/email address/i)).toHaveValue("jason@mail.com");
    });

    test("REG-NEG-007 - logged-in users are redirected away from /register", async ({ page }) => {
        await registerUser(page, {
            name: "Already Logged In User",
            email: uniqueEmail("registerredirect"),
            password: "1234",
        });

        await goto(page, "/register");
        await expect(page).toHaveURL(/\/events\/registrations$/);
        await expect(page.getByText(/my saved events/i)).toBeVisible();
    });

    test("REG-NEG-008 - server should reject missing required fields when POST /register bypasses browser validation", async ({
        request,
    }) => {
        // Exercise the route directly so this check stays independent from browser form behavior
        const response = await request.post(`${BASE_URL}/register`, {
            form: {
                name: "Invalid Registration User",
                email: "",
                password: "1234",
            },
        });

        const body = await response.text();
        expect(response.status()).toBe(400);
        expect(body).toMatch(/please complete every account field/i);
    });

    test("REG-NEG-009 - special characters in the email field should be rejected", async ({ page }) => {
        const specialCharacterEmail = `A@nD#r!w_${Date.now()}@em@il.com`;
        await goto(page, "/register");
        await page.getByLabel(/full name/i).fill("Andrew");
        await page.getByLabel(/email address/i).fill(specialCharacterEmail);
        await page.locator("#password").fill("1234");

        // Bypass native browser validation so the app's actual server behavior is exercised.
        await page.locator('form[action="/register"]').evaluate((form) => {
            form.setAttribute("novalidate", "true");
            form.submit();
        });

        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByText(/please enter a valid name, email, and password/i)).toBeVisible();
    });
});
