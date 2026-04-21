import { test, expect } from "@playwright/test";

test.describe("valid user login", () => {
    test("test", async ({ page }) => {
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

test.describe("invalid user login", () => {
    test("test", async ({ page }) => {
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

test.describe("prevent logging in while logged in", () => {
    test.use({ storageState: "playwright/.auth/user.json" });
    test("logged in user is redirected away from login page", async ({ page }) => {
        await page.goto("/login");
        await expect(page).toHaveURL(/\/events\/registrations/);
        await expect(page.getByText("My saved events")).toBeVisible();
    });
});
