import { test, expect } from "@playwright/test";
import { goto, loginUser, logoutUser, registerUser, uniqueEmail } from "./helpers/eventHub.helpers.js";

test.describe("Valid user login", () => {
    test("LOGIN-POS-001 - clicking Log In opens the login page", async ({ page }) => {
        await goto(page, "/");
        await page.getByRole("link", { name: /^log in$/i }).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(/log in to manage your events/i);
    });

    test("LOGIN-POS-002 - Email Address accepts login input", async ({ page }) => {
        await goto(page, "/login");
        await page.getByLabel(/email address/i).fill("jason@mail.com");
        await expect(page.getByLabel(/email address/i)).toHaveValue("jason@mail.com");
    });

    test("LOGIN-POS-003 - Password accepts login input", async ({ page }) => {
        await goto(page, "/login");
        await page.getByLabel(/password/i).fill("1234");
        await expect(page.getByLabel(/password/i)).toHaveValue("1234");
    });

    test("LOGIN-POS-004 - valid credentials redirect the user to My Events", async ({ page }) => {
        const user = await registerUser(page, {
            name: "Login User",
            email: uniqueEmail("login"),
            password: "1234",
        });

        await logoutUser(page);
        await loginUser(page, user);

        await expect(page.getByText(/my saved events/i)).toBeVisible();
    });
});

test.describe("Invalid user login", () => {
    test("LOGIN-NEG-001 - Password accepts text before it is cleared", async ({ page }) => {
        await goto(page, "/login");
        await page.getByLabel(/password/i).fill("1234");
        await expect(page.getByLabel(/password/i)).toHaveValue("1234");
    });

    test("LOGIN-NEG-002 - Password can be cleared on the login form", async ({ page }) => {
        await goto(page, "/login");
        await page.getByLabel(/password/i).fill("1234");
        await page.getByLabel(/password/i).clear();
        await expect(page.getByLabel(/password/i)).toHaveValue("");
    });

    test("LOGIN-NEG-003 - Email Address accepts a non-matching user email", async ({ page }) => {
        await goto(page, "/login");
        await page.getByLabel(/email address/i).fill("pilla@mail.com");
        await expect(page.getByLabel(/email address/i)).toHaveValue("pilla@mail.com");
    });

    test("LOGIN-NEG-004 - wrong password can be submitted and is rejected", async ({ page }) => {
        const user = await registerUser(page, {
            name: "Wrong Password User",
            email: uniqueEmail("wrongpass"),
            password: "1234",
        });

        await logoutUser(page);
        // Re-enter the same email with a bad password to confirm the auth failure path
        await goto(page, "/login");
        await page.getByLabel(/email address/i).fill(user.email);
        await page.getByLabel(/password/i).fill("wrong-password");
        await page.getByRole("button", { name: /^log in$/i }).click();

        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByText(/incorrect email address or password/i)).toBeVisible();
    });

    test("LOGIN-NEG-005 - logged-in users are redirected away from /login", async ({ page }) => {
        const user = await registerUser(page, {
            name: "Login Redirect User",
            email: uniqueEmail("loginredirect"),
            password: "1234",
        });

        await goto(page, "/login");
        await expect(page).toHaveURL(/\/events\/registrations$/);
        await expect(page.getByText(/my saved events/i)).toBeVisible();
    });
});

test.describe("Logout and protected public routes", () => {
    test("AUTH-001 - Log Out ends the session and returns the user to /login", async ({ page }) => {
        await registerUser(page, {
            name: "Logout User",
            email: uniqueEmail("logout"),
            password: "1234",
        });

        await logoutUser(page);
        await expect(page.getByText(/you have been logged out/i)).toBeVisible();
    });

    test("AUTH-002 - logged-out access to /events/registrations redirects to /login", async ({ page }) => {
        // Start from an authenticated state so this verifies the post-logout guard
        await registerUser(page, {
            name: "Protected Route User 1",
            email: uniqueEmail("protected1"),
            password: "1234",
        });

        await logoutUser(page);
        await goto(page, "/events/registrations");

        await expect(page).toHaveURL(/\/login\?message=/);
        await expect(page.getByText(/please log in to continue/i)).toBeVisible();
    });

    test("AUTH-003 - logged-out access to /events/registrations/calendar redirects to /login", async ({ page }) => {
        await registerUser(page, {
            name: "Protected Route User 2",
            email: uniqueEmail("protected2"),
            password: "1234",
        });

        await logoutUser(page);
        await goto(page, "/events/registrations/calendar");

        await expect(page).toHaveURL(/\/login\?message=/);
        await expect(page.getByText(/please log in to continue/i)).toBeVisible();
    });

    test("AUTH-004 - logged-out access to /events/{id}/register redirects to /login", async ({ page }) => {
        await registerUser(page, {
            name: "Protected Route User 3",
            email: uniqueEmail("protected3"),
            password: "1234",
        });

        await logoutUser(page);
        await goto(page, "/events/0123456789abcdef01234567/register");

        await expect(page).toHaveURL(/\/login\?message=/);
        await expect(page.getByText(/please log in to continue/i)).toBeVisible();
    });
});
