import { test, expect } from "@playwright/test";
import {
	goto,
	registerForEvent,
	openEditSeatsForEvent,
	createEventAsAdmin,
	deleteEventAsAdmin,
	selectEventToEdit,
	adminEventRow,
	registerUser,
	editEventAsAdmin,
} from "./helpers/eventHub.helpers.js";

test.describe("Route Handline / Regression", () => {
	test("REGRESS-001 - create registration, edit seats, delete registration", async ({
		page,
	}) => {
		await registerUser(page);
		const event = await createEventAsAdmin(page);

		await registerForEvent(page, {
			eventTitle: event.title,
			seatCount: 1,
		});

		openEditSeatsForEvent(page, event.title);
		await page.getByLabel(/seat count/i).fill("2");
		await page.getByRole("button", { name: /save seat changes/i }).click();

		await expect(page).toHaveURL(/\/events\/registrations\?message=/);
		await expect(
			page.getByText(/registration updated successfully/i),
		).toBeVisible();

		const row = await page
			.locator("tr")
			.filter({ hasText: event.title })
			.first();
		await expect(row).toContainText("2");

		await row.getByRole("button", { name: /remove event/i }).click();

		await expect(page).toHaveURL(/\/events\/registrations\?message=/);
		await expect(
			page.getByText(/registration removed from your calendar/i),
		).toBeVisible();
	});

	test("REGRESS-002 - create event, edit event, delete event", async ({
		page,
	}) => {
		const event = await createEventAsAdmin(page);
		const newTitle = "new title";

		await editEventAsAdmin(page, event.title, newTitle);
		await deleteEventAsAdmin(page, newTitle);
	});

	test("REGRESS-003 - check malformed ids", async ({ page }) => {
		await registerUser(page);

		await goto(page, "/events/not-a-valid-id");
		await expect(page.getByText(/404 page/i)).toBeDefined();

		await goto(page, "/events/registrations/not-a-valid-id/edit");
		await expect(page.getByText(/404 page/i)).toBeDefined();
	});
});
