import { expect } from "@playwright/test";

export const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

export const SEEDED_EVENTS = Object.freeze({
    SPRING_MUSIC: "Kingston Spring Music Festival",
    CODING_WORKSHOP: "Downtown Coding Workshop",
    FOOD_MARKET: "Waterfront Food Market",
    NETWORKING_NIGHT: "Career Networking Night",
    ART_SHOWCASE: "Community Art Showcase",
    STARTUP_PANEL: "Summer Startup Panel",
    FAMILY_MOVIE: "Family Movie In The Park",
    DEMO_DAY: "August Design Sprint Demo Day",
});

export function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function uniqueEmail(prefix = "eventhub") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function uniqueText(prefix = "PW") {
    return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`;
}

export function isoDateOffset(daysFromToday = 30) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + daysFromToday);
    return date.toISOString().split("T")[0];
}

export async function goto(page, path = "/") {
    await page.goto(`${BASE_URL}${path}`);
}

export async function disableHtmlValidation(page) {
    // Ignore the logout form in the shared nav and disable validation on the task-specific form instead
    await page.evaluate(() => {
        const targetForm = document.querySelector('form:not([action="/logout"])');
        targetForm?.setAttribute("novalidate", "true");
    });
}

export async function registerUser(
    page,
    { name = "Playwright User", email = uniqueEmail("user"), password = "1234" } = {},
) {
    await goto(page, "/register");
    await page.getByLabel(/full name/i).fill(name);
    await page.getByLabel(/email address/i).fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/events\/registrations/);
    await expect(page.getByText(/your account has been created successfully/i)).toBeVisible();

    return { name, email, password };
}

export async function loginUser(page, { email, password }) {
    await goto(page, "/login");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(page).toHaveURL(/\/events\/registrations/);
    await expect(page.getByText(/you are now logged in/i)).toBeVisible();
}

export async function logoutUser(page) {
    const logoutButton = page.getByRole("button", { name: /log out/i }).first();
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();
    await expect(page).toHaveURL(/\/login/);
}

export async function loginAdmin(page, { username = ADMIN_USERNAME, password = ADMIN_PASSWORD } = {}) {
    await goto(page, "/admin/login");

    if (/\/admin\/events/.test(page.url())) return;

    await page.getByLabel(/admin username/i).fill(username);
    await page.getByLabel(/admin password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin\/events$/);
}

export async function logoutAdmin(page) {
    const logoutButton = page.getByRole("button", { name: /log out/i }).first();
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();
    await expect(page).toHaveURL(/\/admin\/login/);
}

export function publicEventLink(page, title) {
    return page.getByRole("link", { name: new RegExp(escapeRegExp(title), "i") }).first();
}

export async function openEventFromDirectory(page, title) {
    await goto(page, "/events");
    const link = publicEventLink(page, title);
    await expect(link).toBeVisible();
    // Read the destination href and navigate directly
    const href = await link.getAttribute("href");
    if (!href) {
        throw new Error(`Could not find href for event "${title}"`);
    }
    await goto(page, href);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
}

export async function getEventHrefByTitle(page, title) {
    await goto(page, "/events");
    const link = publicEventLink(page, title);
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    if (!href) {
        throw new Error(`Could not find href for event "${title}"`);
    }
    return href;
}

export async function getEventIdByTitle(page, title) {
    const href = await getEventHrefByTitle(page, title);
    return href.split("/").filter(Boolean).pop();
}

export function registrationRow(page, title) {
    return page.locator("tr").filter({ hasText: title }).first();
}

export function adminEventRow(page, title) {
    return page.locator("tr").filter({ hasText: title }).first();
}

export async function openEditSeatsForEvent(page, title) {
    await goto(page, "/events/registrations");
    const row = registrationRow(page, title);
    await expect(row).toBeVisible();
    await row.getByRole("link", { name: /edit seats/i }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/adjust your seats/i);
}

export async function fillAdminEventForm(page, event) {
    await page.getByLabel(/event title/i).fill(event.title);
    await page.getByLabel(/event date/i).fill(event.date);
    await page.getByLabel(/location/i).fill(event.location);
    await page.getByLabel(/category/i).fill(event.category);
    await page.getByLabel(/image url/i).fill(event.image);
    await page.getByLabel(/description/i).fill(event.description);
    await page.getByLabel(/available slots/i).fill(String(event.availableSlots));
}

export async function createEventAsAdmin(page, overrides = {}) {
    const event = {
        title: uniqueText("PW Event"),
        date: isoDateOffset(35),
        location: "QA Hall",
        category: "Testing",
        image: "https://example.com/generated-event.jpg",
        description: "Playwright generated event for QA coverage.",
        availableSlots: 25,
        ...overrides,
    };

    if (!/\/admin\/events/.test(page.url())) {
        await loginAdmin(page);
    }

    const addEventLink = page.getByRole("link", { name: /add( new)? event/i }).first();
    await expect(addEventLink).toBeVisible();
    await addEventLink.click();

    await expect(page).toHaveURL(/\/admin\/events\/new$/);
    await fillAdminEventForm(page, event);
    // Submit the admin form directly to avoid browser-specific click timing on the create button
    await page.locator('form[action="/admin/events"]').evaluate((form) => form.submit());

    await expect(page).toHaveURL(/\/admin\/events\?message=/);
    await expect(page.getByText(/event created successfully/i)).toBeVisible();
    await expect(adminEventRow(page, event.title)).toBeVisible();

    return event;
}

export async function deleteEventAsAdmin(page, title = "") {
    if (title === "" || title === null) return;

    if (!/\/admin\/events$/.test(page.url())) {
        await loginAdmin(page);
    }

    const row = await adminEventRow(page, title);
    await row.getByRole("button", { name: "Delete" }).click();

    await expect(page).toHaveURL(/\/admin\/events\?message=/);
    await expect(page.getByText(/Event deleted successfully/i)).toBeVisible();
}

export async function editEventAsAdmin(page, oldTitle = "", newTitle = "") {
    if (oldTitle === "" || oldTitle === null || newTitle === "" || newTitle === null) return;

    if (!/\/admin\/events$/.test(page.url())) {
        await loginAdmin(page);
    }

    const url = await selectEventToEdit(page, oldTitle);
    const action = url.replace("/edit", "?_method=PATCH");

    await page.getByLabel(/event title/i).fill(newTitle);
    await page.locator(`form[action="${action}"]`).evaluate((form) => form.submit());

    await expect(page).toHaveURL(/\/admin\/events\?message=/);
    await expect(page.getByText(/Event updated successfully/i)).toBeVisible();
    await expect(adminEventRow(page, newTitle)).toBeVisible();
}

export async function selectEventToEdit(page, title = "") {
    if (title === "" || title === null) return;

    if (!/\/admin\/events/.test(page.url())) {
        await loginAdmin(page);
    }

    const row = await adminEventRow(page, title);
    const editLink = await row.getByRole("link", { name: "Edit" });
    const url = await editLink.getAttribute("href");

    await editLink.click();

    return url;
}

export async function ensureBaselinePublicEvents(page) {
    await goto(page, "/events");

    // Keep the shared catalog minimal
    const baselineEvents = [
        {
            title: SEEDED_EVENTS.SPRING_MUSIC,
            date: "2026-05-14",
            location: "Confederation Park, Kingston",
            category: "Music",
            image: "https://example.com/spring-music.jpg",
            description: "Baseline public music event for directory coverage.",
            availableSlots: 120,
        },
        {
            title: SEEDED_EVENTS.CODING_WORKSHOP,
            date: "2026-05-20",
            location: "Innovation Hub, Kingston",
            category: "Workshop",
            image: "https://example.com/coding-workshop.jpg",
            description: "Baseline public coding event for directory coverage.",
            availableSlots: 30,
        },
        {
            title: SEEDED_EVENTS.FOOD_MARKET,
            date: "2026-06-02",
            location: "Kingston Waterfront Market Square",
            category: "Food",
            image: "https://example.com/food-market.jpg",
            description: "Baseline public food event for registration coverage.",
            availableSlots: 200,
        },
    ];

    let createdAnyEvents = false;

    for (const baselineEvent of baselineEvents) {
        const eventLink = publicEventLink(page, baselineEvent.title);
        if (await eventLink.count()) {
            continue;
        }

        await createEventAsAdmin(page, baselineEvent);
        createdAnyEvents = true;
    }

    if (createdAnyEvents) {
        await logoutAdmin(page);
    }
}

export async function registerForEvent(page, { eventTitle, seatCount = 2 } = {}) {
    await openEventFromDirectory(page, eventTitle);
    const registerLink = page.getByRole("link", {
        name: /register for this event/i,
    });
    const href = await registerLink.getAttribute("href");
    if (!href) {
        throw new Error(`Could not find register link for event "${eventTitle}"`);
    }

    await goto(page, href);

    await expect(page).toHaveURL(/\/events\/[a-f0-9]{24}\/register$/i);
    await page.getByLabel(/seat count/i).fill(String(seatCount));
    // Submit the real registration form so the helper follows the same server flow every time
    await page.locator('form[action*="/register"]').evaluate((form) => form.submit());

    await expect(page).toHaveURL(/\/events\/registrations/);
    await expect(page.getByText(/registration created successfully/i)).toBeVisible();
}

export async function registerFreshUserForEvent(
    page,
    {
        name = "Playwright User",
        email = uniqueEmail("book"),
        password = "1234",
        eventTitle = SEEDED_EVENTS.SPRING_MUSIC,
        seatCount = 2,
    } = {},
) {
    const user = await registerUser(page, { name, email, password });
    await registerForEvent(page, { eventTitle, seatCount });
    return user;
}

export async function postFormFromPage(page, path, payload) {
    return await page.evaluate(
        async ({ pathValue, payloadValue }) => {
            const response = await fetch(pathValue, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                },
                body: new URLSearchParams(payloadValue).toString(),
                redirect: "follow",
            });

            return {
                status: response.status,
                url: response.url,
                redirected: response.redirected,
                text: await response.text(),
            };
        },
        { pathValue: path, payloadValue: payload },
    );
}

export async function createPastAndFutureEvents(page) {
    await loginAdmin(page);

    const pastEvent = await createEventAsAdmin(page, {
        title: uniqueText("PW Past Event"),
        date: isoDateOffset(-10),
        availableSlots: 10,
    });

    const futureEvent = await createEventAsAdmin(page, {
        title: uniqueText("PW Future Event"),
        date: isoDateOffset(12),
        availableSlots: 10,
    });

    await logoutAdmin(page);

    return { pastEvent, futureEvent };
}
