import { test, expect } from "@playwright/test";
import { goto, loginAdmin, logoutAdmin } from "./helpers/eventHub.helpers.js";

test.describe("Admin Login", () => {
	test("ADMLOGIN-POS-001 - Admin Log In page loads", async ({ page }) => {
		await goto(page, "/");
		await page.getByRole("link", { name: /admin dashboard/i }).click();
		await expect(page).toHaveURL(/\/admin\/login$/);
		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			/Sign in to manage Event Hub/i,
		);
	});

	test("ADMLOGIN-POS-002 - Username accepts input", async ({ page }) => {
		await goto(page, "/admin/login");
		await page.getByLabel(/admin username/i).fill("admin");
		await expect(page.getByLabel(/admin username/i)).toHaveValue("admin");
	});

	test("ADMLOGIN-POS-003 - Password accepts input", async ({ page }) => {
		await goto(page, "/admin/login");
		await page.getByLabel(/admin password/i).fill("1234");
		await expect(page.getByLabel(/admin password/i)).toHaveValue("1234");
	});

	test("ADMLOGIN-POS-004 - admin logs in", async ({ page }) => {
		const admin = {
			username: "admin",
			password: "1234",
		};

		await loginAdmin(page, admin);
	});

	test("ADMLOGIN-POS-005 - admin logs out", async ({ page }) => {
		const admin = {
			username: "admin",
			password: "1234",
		};

		await loginAdmin(page, admin);
		await logoutAdmin(page);
	});
});

test.describe("Invalid Admin Login", () => {
	test("ADMLOGIN-NEG-001 - wrong password is rejected", async ({ page }) => {
		await goto(page, "/admin/login");

		await page.getByLabel(/admin username/i).fill("admin");
		await page.getByLabel(/admin password/i).fill("5678");
		await page.getByRole("button", { name: /sign in/i }).click();

		await expect(page).toHaveURL(/\/admin\/login$/);
		await expect(
			page.getByText(/incorrect username or password/i),
		).toBeVisible();
	});

	test("ADMLOGIN-NEG-002 - wrong username is rejected", async ({ page }) => {
		await goto(page, "/admin/login");

		await page.getByLabel(/admin username/i).fill("jason");
		await page.getByLabel(/admin password/i).fill("1234");
		await page.getByRole("button", { name: /sign in/i }).click();

		await expect(page).toHaveURL(/\/admin\/login$/);
		await expect(
			page.getByText(/incorrect username or password/i),
		).toBeVisible();
	});
});
