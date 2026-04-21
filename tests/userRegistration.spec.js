import { test, expect } from "@playwright/test";

test.describe("valid user registration", () => {
    test("valid-user-registration", async ({ page }) => {
        const email = `jason_${Date.now()}@email.com`;

        await page.goto("http://localhost:3000/");
        await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
        await page.getByRole("link", { name: "Register" }).click();
        await page.getByRole("textbox", { name: "Full Name" }).fill("jason");
        await page.getByRole("textbox", { name: "Email Address" }).fill(email);
        await page.locator("#password").fill("ryan");
        await page.getByRole("button", { name: "Create Account" }).click();
        await expect(page).toHaveURL(/\/events\/registrations\?message=/);
        await expect(page.getByText(/your account has been created successfully/i)).toBeVisible();
        await expect(page.getByText("My saved events")).toBeVisible();
    });
});

test.describe("invalid user registration", () => {
    test("blank user", async ({ page }) => {
        await page.goto("http://localhost:3000/");
        await page.getByRole("link", { name: "Register" }).click();
        await expect(page.getByRole("textbox", { name: "Full Name" })).toBeEmpty();
        await expect(page.getByRole("textbox", { name: "Email Address" })).toBeEmpty();
        await expect(page.getByRole("textbox", { name: "Password" })).toBeEmpty();
        await page.getByRole("button", { name: "Create Account" }).click();
        await expect(page.getByRole("heading", { name: "Register before you start" })).toBeVisible();
    });

    test("incomplete user", async ({ page }) => {
        await page.goto("http://localhost:3000/");
        await page.getByRole("link", { name: "Register" }).click();
        await page.getByRole("textbox", { name: "Email Address" }).click();
        await page.getByRole("textbox", { name: "Email Address" }).fill("jasonmail.com");
        await page.getByRole("button", { name: "Create Account" }).click();
        await expect(page.getByRole("heading", { name: "Register before you start" })).toBeVisible();
    });
});

test.describe("prevent logged-in registration", () => {
    test.use({ storageState: "playwright/.auth/user.json" });

    test("logged in user is redirected away from register page", async ({ page }) => {
        await page.goto("/register");
        await expect(page).toHaveURL(/\/events\/registrations/);
        await expect(page.getByText("My saved events")).toBeVisible();
    });
});
