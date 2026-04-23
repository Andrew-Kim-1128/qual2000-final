import { test, expect } from "@playwright/test";
import {
	goto,
	loginAdmin,
	logoutAdmin,
	createEventAsAdmin,
	deleteEventAsAdmin,
	editEventAsAdmin,
	selectEventToEdit,
	adminEventRow,
} from "./helpers/eventHub.helpers.js";

test.describe("Admin Edit", () => {
	let event = {};

	test.beforeEach(async ({ page }) => {
		event = await createEventAsAdmin(page);
	});

	test.afterEach(async ({ page }) => {
		await deleteEventAsAdmin(page, event.title);
	});

	test("ADMEDT-POS-001 - Edit Event page loads", async ({ page }) => {
		const url = await selectEventToEdit(page, event.title);
		await expect(page).toHaveURL(new RegExp(url));

		await expect(page.getByLabel(/event title/i)).toHaveValue(event.title);
		await expect(page.getByLabel(/event date/i)).toHaveValue(event.date);
		await expect(page.getByLabel(/location/i)).toHaveValue(event.location);
		await expect(page.getByLabel(/category/i)).toHaveValue(event.category);
		await expect(page.getByLabel(/image url/i)).toHaveValue(event.image);
		await expect(page.getByLabel(/description/i)).toHaveValue(
			event.description,
		);
		await expect(page.getByLabel(/available slots/i)).toHaveValue(
			String(event.availableSlots),
		);
	});

	test("ADMEDT-POS-002 - edited values are accepted.", async ({ page }) => {
		const newTitle = "New Title";

		await selectEventToEdit(page, event.title);
		await page.getByLabel(/event title/i).fill(newTitle);
		await expect(page.getByLabel(/event title/i)).toHaveValue(newTitle);
	});

	test("ADMEDT-POS-003 - event is updated", async ({ page }) => {
		const newTitle = "new title";

		await editEventAsAdmin(page, event.title, newTitle);

		event.title = newTitle;
	});

	test("ADMEDT-POS-004 - update is visible on public site", async ({
		page,
	}) => {
		const newTitle = "new title";

		await editEventAsAdmin(page, event.title, newTitle);

		event.title = newTitle;

		await goto(page, "/events");

		const anchor = await page
			.getByRole("link")
			.filter({ hasText: event.title })
			.first();

		await expect(anchor).toBeDefined();

		const url = await anchor.getAttribute("href");

		anchor.click();

		await expect(page).toHaveURL(new RegExp(url));
		await expect(page.getByText(event.description)).toBeDefined();
		await expect(page.getByText(/Log In To Register/)).toBeDefined();
	});
});

test.describe("Invalid Admin Edit Event", () => {
	test("ADMEDT-NEG-001 - black fields are rejected", async ({ page }) => {
		const event = await createEventAsAdmin(page);

		const url = await selectEventToEdit(page, event.title);
		const action = url.replace("/edit", "?_method=PATCH");

		await page.getByLabel(/event title/i).fill("");

		await page.getByRole("button", { name: "Save Changes" }).click();

		await expect(page).toHaveURL(new RegExp(url));

		const validationMessage = await page
			.getByRole("textbox", { name: "Event Title" })
			.evaluate((e) => e.validationMessage);

		await expect([
			"Please fill out this field.",
			"Fill out this field",
		]).toContain(validationMessage);

		await deleteEventAsAdmin(page, event.title);
	});

	test("ADMEDT-NEG-002 - negative Available Slots are regected", async ({
		page,
	}) => {
		const event = await createEventAsAdmin(page);

		const url = await selectEventToEdit(page, event.title);
		const action = url.replace("/edit", "?_method=PATCH");

		await page.getByLabel(/available slots/i).fill("-1");

		await page.getByRole("button", { name: "Save Changes" }).click();

		await expect(page).toHaveURL(new RegExp(url));

		const validationMessage = await page
			.getByRole("spinbutton", { name: "Available Slots" })
			.evaluate((e) => e.validationMessage);

		await expect([
			"Value must be greater than or equal to 0.",
			"Please select a value that is no less than 0.",
			"range underflow",
		]).toContain(validationMessage);

		await deleteEventAsAdmin(page, event.title);
	});

	test("ADMEDT-NEG-003 - check malformed ids", async ({ page }) => {
		await loginAdmin(page);

		await goto(page, "/admin/events/not-a-valid-id/edit");
		await expect(page.getByText(/404 page/i)).toBeDefined();
	});

	test("ADMEDT-NEG-004 - access violation rejected", async ({ page }) => {
		const event = await createEventAsAdmin(page);

		const url = await selectEventToEdit(page, event.title);

		await logoutAdmin(page);

		await goto(page, url);
		await expect(page).toHaveURL(/\/admin\/login$/);

		await deleteEventAsAdmin(page, event.title);
	});

	test("ADMEDT-NEG-005 - duplicate event rejected", async ({ page }) => {
		const events = [
			await createEventAsAdmin(page),
			await createEventAsAdmin(page),
		];

		const url = await selectEventToEdit(page, events[1].title);
		const action = url.replace("/edit", "?_method=PATCH");

		await page.getByLabel(/event title/i).fill(events[0].title);
		await page.getByLabel(/event date/i).fill(events[0].date);
		await page.getByLabel(/location/i).fill(events[0].location);
		await page.getByLabel(/category/i).fill(events[0].category);
		await page.getByLabel(/image url/i).fill(events[0].image);
		await page.getByLabel(/description/i).fill(events[0].description);
		await page
			.getByLabel(/available slots/i)
			.fill(String(events[0].availableSlots));

		await page.getByRole("button", { name: "Save Changes" }).click();

		await expect(page).toHaveURL(new RegExp(url));

		await deleteEventAsAdmin(page, events[0].title);
		await deleteEventAsAdmin(page, events[1].title);
	});
});
