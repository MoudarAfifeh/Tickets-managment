import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { WEBHOOK_SECRET } from "./credentials";
import { ADMIN_STORAGE_STATE, AGENT_STORAGE_STATE } from "./storage-state";

// GET /api/tickets and the / ticket-list page. Tickets can only be created
// via the inbound-email webhook (no create-ticket UI yet), so every test
// that needs a ticket seeds one itself through that endpoint, mirroring the
// conventions in inbound-email-webhook.spec.ts: a fresh unique sender email
// + subject per seeded ticket avoids threading into another test's ticket
// and keeps tests independent/parallel-safe (fullyParallel is on).
//
// The tickets table is shared across the whole test database (no per-test
// cleanup), so assertions target the specific seeded rows by their unique
// subject text rather than exact row counts or "the first row".
const WEBHOOK_ENDPOINT = "/api/webhooks/inbound-email";

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function seedTicket(
  request: APIRequestContext,
  overrides: { fromName?: string; subject?: string; body?: string } = {},
) {
  const token = unique();
  const senderEmail = `e2e-tickets-${token}@example.com`;
  const subject = overrides.subject ?? `E2E ticket subject ${token}`;
  const body = overrides.body ?? `E2E ticket body ${token}`;

  const res = await request.post(WEBHOOK_ENDPOINT, {
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    data: {
      from: senderEmail,
      fromName: overrides.fromName,
      subject,
      body,
    },
  });

  expect(res.status()).toBe(201);
  const json = await res.json();
  return {
    id: json.ticket.id as string,
    senderEmail,
    fromName: overrides.fromName,
    subject,
    body,
  };
}

function rowFor(page: Page, text: string) {
  return page.getByRole("row").filter({ hasText: text });
}

function searchInput(page: Page) {
  return page.getByPlaceholder("Search subject or sender...");
}

// TicketFilters renders the search Input first, then the Status Select,
// then the Category Select — Base UI Select triggers have role "combobox"
// and their accessible name is the *currently selected* option's label, so
// index into them positionally instead (stable across selection changes).
const STATUS_COMBOBOX_INDEX = 0;
const CATEGORY_COMBOBOX_INDEX = 1;

async function selectFilterOption(
  page: Page,
  comboboxIndex: number,
  optionName: string,
) {
  await page.getByRole("combobox").nth(comboboxIndex).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

// The Subject column is rendered first, so a row's first cell is its
// subject. Returns the subject text of every row currently matching
// `filterText`, in DOM (render) order.
async function subjectColumnValues(page: Page, filterText: string) {
  const rows = page.getByRole("row").filter({ hasText: filterText });
  const count = await rows.count();
  const values: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).getByRole("cell").first().textContent();
    values.push(text ?? "");
  }
  return values;
}

test.describe("GET /api/tickets (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    const res = await request.get("/api/tickets");
    expect(res.status()).toBe(401);
  });
});

test.describe("Ticket list (/)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("shows seeded tickets newest-first", async ({ page, request }) => {
    const older = await seedTicket(request);
    // Guarantee a distinct, later createdAt for the second ticket.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const newer = await seedTicket(request);

    await page.goto("/");
    await expect(page).toHaveURL("/");

    const olderRow = rowFor(page, older.subject);
    const newerRow = rowFor(page, newer.subject);
    await expect(olderRow).toBeVisible();
    await expect(newerRow).toBeVisible();

    // Newest-first ordering should be visible in actual DOM order: the
    // newer row's bounding box sits above the older row's.
    const rows = page.getByRole("row");
    const allRowTexts = await rows.allTextContents();
    const newerIndex = allRowTexts.findIndex((text) =>
      text.includes(newer.subject),
    );
    const olderIndex = allRowTexts.findIndex((text) =>
      text.includes(older.subject),
    );
    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  test("a seeded row shows sender, category, status, and Unassigned", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request, {
      fromName: `E2E Sender ${unique()}`,
    });

    await page.goto("/");

    const row = rowFor(page, ticket.subject);
    await expect(row).toBeVisible();

    // From: the provided sender name (not the email).
    await expect(row.getByText(ticket.fromName!, { exact: true })).toBeVisible();

    // Category: default category, humanized, rendered as a badge.
    await expect(
      row.getByText("General question", { exact: true }),
    ).toBeVisible();

    // Status: default status, rendered as a lowercase-text badge.
    await expect(row.getByText("open", { exact: true })).toBeVisible();

    // Assigned to: the webhook never assigns a ticket.
    await expect(
      row.getByText("Unassigned", { exact: true }),
    ).toBeVisible();
  });

  test("falls back to sender email when no fromName is provided", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");

    const row = rowFor(page, ticket.subject);
    await expect(row).toBeVisible();
    await expect(
      row.getByText(ticket.senderEmail, { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Ticket list sorting", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("clicking a column header sorts ascending, clicking again sorts descending", async ({
    page,
    request,
  }) => {
    const token = unique();
    const subjectFor = (label: string) => `Sorting test ${token} ${label}`;
    // Seed out of alphabetical order so ascending/descending are distinguishable.
    await seedTicket(request, { subject: subjectFor("Bravo") });
    await seedTicket(request, { subject: subjectFor("Alpha") });
    await seedTicket(request, { subject: subjectFor("Charlie") });

    await page.goto("/");
    await searchInput(page).fill(`Sorting test ${token}`);

    // Wait for the search to narrow the table to exactly the 3 seeded rows.
    await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(
      3,
    );

    const subjectHeader = page.getByRole("columnheader", {
      name: "Subject",
      exact: true,
    });

    await subjectHeader.getByRole("button").click();
    await expect(subjectHeader.locator("svg.lucide-arrow-up")).toBeVisible();
    await expect.poll(() => subjectColumnValues(page, token)).toEqual([
      subjectFor("Alpha"),
      subjectFor("Bravo"),
      subjectFor("Charlie"),
    ]);

    await subjectHeader.getByRole("button").click();
    await expect(
      subjectHeader.locator("svg.lucide-arrow-down"),
    ).toBeVisible();
    await expect.poll(() => subjectColumnValues(page, token)).toEqual([
      subjectFor("Charlie"),
      subjectFor("Bravo"),
      subjectFor("Alpha"),
    ]);
  });
});

test.describe("Ticket list filtering", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("status filter excludes the seeded open ticket for a different status, includes it for Open / All statuses", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");
    // Scope the table to just this ticket via search, so the filter
    // assertions below aren't at the mercy of pagination/other rows.
    await searchInput(page).fill(ticket.subject);
    await expect(rowFor(page, ticket.subject)).toBeVisible();

    await selectFilterOption(page, STATUS_COMBOBOX_INDEX, "Resolved");
    await expect(rowFor(page, ticket.subject)).toHaveCount(0);

    await selectFilterOption(page, STATUS_COMBOBOX_INDEX, "Open");
    await expect(rowFor(page, ticket.subject)).toBeVisible();

    await selectFilterOption(page, STATUS_COMBOBOX_INDEX, "All statuses");
    await expect(rowFor(page, ticket.subject)).toBeVisible();
  });

  test("category filter excludes the seeded general-question ticket for a different category, includes it for General question / All categories", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");
    await searchInput(page).fill(ticket.subject);
    await expect(rowFor(page, ticket.subject)).toBeVisible();

    await selectFilterOption(
      page,
      CATEGORY_COMBOBOX_INDEX,
      "Technical question",
    );
    await expect(rowFor(page, ticket.subject)).toHaveCount(0);

    await selectFilterOption(page, CATEGORY_COMBOBOX_INDEX, "General question");
    await expect(rowFor(page, ticket.subject)).toBeVisible();

    await selectFilterOption(page, CATEGORY_COMBOBOX_INDEX, "All categories");
    await expect(rowFor(page, ticket.subject)).toBeVisible();
  });
});

test.describe("Ticket list search", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("narrows the table to rows whose subject matches the typed text", async ({
    page,
    request,
  }) => {
    const token = unique();
    const matching = await seedTicket(request, {
      subject: `Search test ${token} match`,
    });
    const other = await seedTicket(request, {
      subject: `Search test ${token} other`,
    });

    await page.goto("/");
    await searchInput(page).fill(`${token} match`);

    await expect(rowFor(page, matching.subject)).toBeVisible();
    await expect(rowFor(page, other.subject)).toHaveCount(0);
  });

  test("matches by sender name", async ({ page, request }) => {
    const token = unique();
    const senderName = `E2E Search Sender ${token}`;
    const ticket = await seedTicket(request, { fromName: senderName });

    await page.goto("/");
    await searchInput(page).fill(senderName);

    await expect(rowFor(page, ticket.subject)).toBeVisible();
  });

  test("matches by sender email", async ({ page, request }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");
    await searchInput(page).fill(ticket.senderEmail);

    await expect(rowFor(page, ticket.subject)).toBeVisible();
  });
});

test.describe("Ticket list pagination", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("paginates search-scoped results with correct counts, boundaries, and resets to page 1 on sort/filter change", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    const token = unique();
    const TOTAL = 11;
    const tickets: Awaited<ReturnType<typeof seedTicket>>[] = [];
    for (let i = 1; i <= TOTAL; i++) {
      tickets.push(
        await seedTicket(request, {
          subject: `Pagination test ${token} #${i}`,
        }),
      );
    }

    await page.goto("/");
    await searchInput(page).fill(`Pagination test ${token}`);

    const scopedRows = page.getByRole("row").filter({ hasText: token });

    // Page 1: first 10 of 11 rows, Previous disabled, Next enabled.
    await expect(scopedRows).toHaveCount(10);
    await expect(
      page.getByText(`Showing 1-10 of ${TOTAL}`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Previous" }),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: "Next" })).toBeEnabled();

    const page1Subjects = await subjectColumnValues(page, token);

    // Advance to page 2: the remaining 1 row, Next disabled, Previous enabled.
    await page.getByRole("button", { name: "Next" }).click();
    await expect(scopedRows).toHaveCount(1);
    await expect(
      page.getByText(`Showing 11-${TOTAL} of ${TOTAL}`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Previous" }),
    ).toBeEnabled();

    const page2Subjects = await subjectColumnValues(page, token);

    expect(page1Subjects).toHaveLength(10);
    expect(page2Subjects).toHaveLength(1);
    expect([...page1Subjects, ...page2Subjects].sort()).toEqual(
      tickets.map((t) => t.subject).sort(),
    );

    // Changing the sort while on page 2 resets back to page 1.
    await page
      .getByRole("columnheader", { name: "Subject", exact: true })
      .getByRole("button")
      .click();
    await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();

    // Changing a filter also resets back to page 1 — here to a status with
    // no matches (only open tickets can be seeded), so it should land on a
    // single, empty page.
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
    await selectFilterOption(page, STATUS_COMBOBOX_INDEX, "Resolved");
    await expect(page.getByText("Page 1 of 1", { exact: true })).toBeVisible();
    await expect(page.getByText("No tickets", { exact: true })).toBeVisible();
  });
});

test.describe("Ticket detail (/tickets/:id)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("clicking a ticket's subject on the list navigates to its detail page with full info, and Back to tickets returns to /", async ({
    page,
    request,
  }) => {
    const fromName = `E2E Detail Sender ${unique()}`;
    const ticket = await seedTicket(request, { fromName });

    await page.goto("/");
    await rowFor(page, ticket.subject).getByRole("link", {
      name: ticket.subject,
    }).click();

    await expect(page).toHaveURL(`/tickets/${ticket.id}`);

    // Subject as the card title.
    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();

    // Status and category badges.
    await expect(page.getByText("open", { exact: true })).toBeVisible();
    await expect(
      page.getByText("General question", { exact: true }),
    ).toBeVisible();

    // Header identity: display name, plus a separate "{email} · {date}" line.
    await expect(page.getByText(fromName, { exact: true })).toBeVisible();
    await expect(
      page.getByText(new RegExp(`^${escapeRegExp(ticket.senderEmail)} ·`)),
    ).toBeVisible();

    // The webhook never assigns a ticket. "Assigned to" is now an
    // interactive Select (see the "Ticket assignment" describe block below),
    // so the label and the select's displayed value are separate elements
    // rather than one combined text node.
    await expect(page.getByText("Assigned to", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Assigned to" }),
    ).toContainText("Unassigned");

    // Plain-text body.
    await expect(page.getByText(ticket.body, { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Back to tickets" }).click();
    await expect(page).toHaveURL("/");
  });

  test("direct navigation to a ticket's URL renders its detail (no name provided falls back to email as the display identity)", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto(`/tickets/${ticket.id}`);

    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(ticket.body, { exact: true })).toBeVisible();
    // The "{email} · {date}" line always shows the email...
    await expect(
      page.getByText(new RegExp(`^${escapeRegExp(ticket.senderEmail)} ·`)),
    ).toBeVisible();
    // ...and with no senderName, the header identity also falls back to the
    // email, so it now appears twice: once as that identity, once as the
    // "Sender" mailto link in the sidebar.
    await expect(
      page.getByText(ticket.senderEmail, { exact: true }),
    ).toHaveCount(2);
  });

  test("a nonexistent ticket id shows a not-found state", async ({
    page,
  }) => {
    await page.goto(`/tickets/does-not-exist-${unique()}`);

    // TicketDetail.tsx distinguishes a 404 (axios.isAxiosError(error) &&
    // error.response?.status === 404) and renders this friendly copy
    // instead of the raw axios error message (which is what non-404
    // errors still fall back to).
    await expect(
      page.getByText("Ticket not found", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "This ticket doesn't exist or may have been removed.",
        { exact: true },
      ),
    ).toBeVisible();
  });
});

// Assigning a ticket to a user (PATCH /api/tickets/:id/assign, backed by the
// "Assigned to" Select on the ticket detail page). The dropdown's options
// come from GET /api/tickets/assignees, which lists every non-deleted user —
// "Admin" and "Agent" are the only accounts guaranteed to exist in the test
// database (seeded by server/prisma/seed.ts), so tests assign to/from the
// seeded "Agent" rather than creating a dedicated assignee.
test.describe("Ticket assignment (/tickets/:id)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  async function selectAssignee(page: Page, optionName: string) {
    // The assign Select is the only combobox on the ticket detail page; its
    // trigger has a fixed aria-label ("Assigned to") independent of the
    // currently selected value.
    const combobox = page.getByRole("combobox", { name: "Assigned to" });
    const option = page.getByRole("option", { name: optionName, exact: true });

    // Unlike the Status/Category selects, this one's options depend on a
    // separate `/api/tickets/assignees` fetch that can still be in flight
    // when the popup first opens — especially under Playwright's default
    // parallel workers, where CPU contention slows that request down. If it
    // resolves mid-interaction, the options list re-renders and can detach
    // the very option Playwright is mid-click on ("element was detached
    // from the DOM, retrying"), and the popup sometimes closes outright in
    // that window rather than just re-rendering its contents — so retrying
    // the click alone isn't enough, since the option never reappears.
    // Retry the whole open-then-click sequence instead, so a closed/detached
    // popup gets reopened and re-clicked.
    await expect(async () => {
      await combobox.click();
      await option.click({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
  }

  test("assigning to an agent via the select is reflected on the detail page and the tickets list, and unassigning reverts both", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");
    await rowFor(page, ticket.subject)
      .getByRole("link", { name: ticket.subject })
      .click();
    await expect(page).toHaveURL(`/tickets/${ticket.id}`);

    // Starts unassigned (the webhook never assigns a ticket).
    const assignCombobox = page.getByRole("combobox", { name: "Assigned to" });
    await expect(assignCombobox).toContainText("Unassigned");

    await selectAssignee(page, "Agent");
    await expect(assignCombobox).toContainText("Agent");
    // No error message from the mutation.
    await expect(page.getByText("Assignee not found")).toHaveCount(0);

    // Navigate back to the list via the in-app link (no full page reload),
    // exercising the ["tickets"] query invalidation the mutation triggers.
    await page.getByRole("link", { name: "Back to tickets" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      rowFor(page, ticket.subject).getByText("Agent", { exact: true }),
    ).toBeVisible();

    // Back into the ticket: the select still shows the assignment...
    await rowFor(page, ticket.subject)
      .getByRole("link", { name: ticket.subject })
      .click();
    await expect(page).toHaveURL(`/tickets/${ticket.id}`);
    await expect(assignCombobox).toContainText("Agent");

    // ...and unassigning it reverts the select and the list row.
    await selectAssignee(page, "Unassigned");
    await expect(assignCombobox).toContainText("Unassigned");

    await page.getByRole("link", { name: "Back to tickets" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      rowFor(page, ticket.subject).getByText("Unassigned", { exact: true }),
    ).toBeVisible();
  });

  test("direct navigation to an already-assigned ticket shows the assignee in the select", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    const assigneesRes = await request.get("/api/tickets/assignees");
    expect(assigneesRes.status()).toBe(200);
    const { users } = (await assigneesRes.json()) as {
      users: { id: string; name: string }[];
    };
    const agent = users.find((u) => u.name === "Agent");
    expect(agent).toBeTruthy();

    const assignRes = await request.patch(
      `/api/tickets/${ticket.id}/assign`,
      { data: { assignedToId: agent!.id } },
    );
    expect(assignRes.status()).toBe(200);

    await page.goto(`/tickets/${ticket.id}`);
    await expect(
      page.getByRole("combobox", { name: "Assigned to" }),
    ).toContainText("Agent");
  });
});

// Updating a ticket's status/category (PATCH /api/tickets/:id/status and
// /category, backed by the Status Select in the page header and the
// Category Select in the sidebar). Both mirror the "Assigned to" Select
// exactly — see the "Ticket assignment" describe block above — except the
// dropdown options are the fixed status/category enum values rather than a
// server-fetched list.
test.describe("Ticket status & category (/tickets/:id)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  function statusCombobox(page: Page) {
    // Fixed aria-label ("Status") independent of the currently selected
    // value — this page has 3 comboboxes (Status, Category, Assigned to),
    // so a bare getByRole("combobox") would be a strict-mode violation.
    return page.getByRole("combobox", { name: "Status" });
  }

  function categoryCombobox(page: Page) {
    return page.getByRole("combobox", { name: "Category" });
  }

  async function selectStatus(page: Page, optionName: string) {
    await statusCombobox(page).click();
    await page.getByRole("option", { name: optionName, exact: true }).click();
  }

  async function selectCategory(page: Page, optionName: string) {
    await categoryCombobox(page).click();
    await page.getByRole("option", { name: optionName, exact: true }).click();
  }

  test("changing status via the select is reflected on the detail page and the tickets list", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");
    await rowFor(page, ticket.subject)
      .getByRole("link", { name: ticket.subject })
      .click();
    await expect(page).toHaveURL(`/tickets/${ticket.id}`);

    // Starts open (the webhook always creates open tickets).
    await expect(statusCombobox(page)).toContainText("open");

    await selectStatus(page, "resolved");
    await expect(statusCombobox(page)).toContainText("resolved");
    // No error message from the mutation.
    await expect(page.getByText("Invalid status")).toHaveCount(0);

    // Navigate back to the list via the in-app link (no full page reload),
    // exercising the ["tickets"] query invalidation the mutation triggers.
    await page.getByRole("link", { name: "Back to tickets" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      rowFor(page, ticket.subject).getByText("resolved", { exact: true }),
    ).toBeVisible();

    // Back into the ticket: the select still shows the updated status.
    await rowFor(page, ticket.subject)
      .getByRole("link", { name: ticket.subject })
      .click();
    await expect(page).toHaveURL(`/tickets/${ticket.id}`);
    await expect(statusCombobox(page)).toContainText("resolved");
  });

  test("changing category via the select is reflected on the detail page and the tickets list", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");
    await rowFor(page, ticket.subject)
      .getByRole("link", { name: ticket.subject })
      .click();
    await expect(page).toHaveURL(`/tickets/${ticket.id}`);

    // Starts general_question (the webhook always creates that category).
    await expect(categoryCombobox(page)).toContainText("General question");

    await selectCategory(page, "Refund request");
    await expect(categoryCombobox(page)).toContainText("Refund request");
    // No error message from the mutation.
    await expect(page.getByText("Invalid category")).toHaveCount(0);

    await page.getByRole("link", { name: "Back to tickets" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      rowFor(page, ticket.subject).getByText("Refund request", {
        exact: true,
      }),
    ).toBeVisible();

    // Back into the ticket: the select still shows the updated category.
    await rowFor(page, ticket.subject)
      .getByRole("link", { name: ticket.subject })
      .click();
    await expect(page).toHaveURL(`/tickets/${ticket.id}`);
    await expect(categoryCombobox(page)).toContainText("Refund request");
  });
});

// Replying to a ticket (POST /api/tickets/:id/replies, backed by the Reply
// form in the left-column card's CardFooter). Every ticket detail response
// (GET, and every mutation) includes the current `replies` array, so a
// successful reply shows up in the thread via the ["ticket", id] query
// invalidation the mutation triggers, with no full page reload.
test.describe("Ticket replies (/tickets/:id)", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("submitting a reply appends it to the thread with the signed-in user's name and clears the textarea", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);
    const replyBody = `E2E reply body ${unique()}`;

    await page.goto(`/tickets/${ticket.id}`);
    await expect(
      page.getByText(ticket.subject, { exact: true }),
    ).toBeVisible();

    const replyField = page.getByLabel("Reply");
    await replyField.fill(replyBody);
    await page.getByRole("button", { name: "Send reply" }).click();

    // The reply body renders in its own paragraph inside the message
    // bubble, which also holds the author's name — scope the author
    // assertion to that bubble (its immediate parent) rather than a bare
    // page-wide "Admin" text match, since NavBar also renders the signed-in
    // user's name.
    const replyParagraph = page.getByText(replyBody, { exact: true });
    await expect(replyParagraph).toBeVisible();
    const replyBubble = replyParagraph.locator("..");
    // The seeded admin account (server/prisma/seed.ts) is named "Admin" —
    // that's who ADMIN_STORAGE_STATE is signed in as, so it's the reply's
    // author.
    await expect(
      replyBubble.getByText("Admin", { exact: true }),
    ).toBeVisible();

    // Textarea clears on success, and no validation/server error is left
    // behind.
    await expect(replyField).toHaveValue("");
    await expect(page.getByText("Message is required")).toHaveCount(0);
  });
});

test.describe("POST /api/tickets/:id/replies (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    const res = await request.post(
      `/api/tickets/does-not-exist-${unique()}/replies`,
      { data: { body: "test" } },
    );
    expect(res.status()).toBe(401);
  });

  test.describe("authenticated", () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test("400s for an empty/whitespace-only body", async ({ request }) => {
      const ticket = await seedTicket(request);

      const res = await request.post(`/api/tickets/${ticket.id}/replies`, {
        data: { body: "   " },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe("Message is required");
    });

    test("404s for a nonexistent ticket", async ({ request }) => {
      const res = await request.post(
        `/api/tickets/does-not-exist-${unique()}/replies`,
        { data: { body: "test" } },
      );
      expect(res.status()).toBe(404);
      expect((await res.json()).error).toBe("Ticket not found");
    });
  });
});

test.describe("PATCH /api/tickets/:id/status (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    const res = await request.patch(
      `/api/tickets/does-not-exist-${unique()}/status`,
      { data: { status: "resolved" } },
    );
    expect(res.status()).toBe(401);
  });

  test.describe("authenticated", () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test("400s for an invalid status value", async ({ request }) => {
      const ticket = await seedTicket(request);

      const res = await request.patch(`/api/tickets/${ticket.id}/status`, {
        data: { status: "not-a-real-status" },
      });
      expect(res.status()).toBe(400);
    });

    test("404s for a nonexistent ticket", async ({ request }) => {
      const res = await request.patch(
        `/api/tickets/does-not-exist-${unique()}/status`,
        { data: { status: "resolved" } },
      );
      expect(res.status()).toBe(404);
      expect((await res.json()).error).toBe("Ticket not found");
    });
  });
});

test.describe("PATCH /api/tickets/:id/category (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    const res = await request.patch(
      `/api/tickets/does-not-exist-${unique()}/category`,
      { data: { category: "refund_request" } },
    );
    expect(res.status()).toBe(401);
  });

  test.describe("authenticated", () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test("400s for an invalid category value", async ({ request }) => {
      const ticket = await seedTicket(request);

      const res = await request.patch(`/api/tickets/${ticket.id}/category`, {
        data: { category: "not-a-real-category" },
      });
      expect(res.status()).toBe(400);
    });

    test("404s for a nonexistent ticket", async ({ request }) => {
      const res = await request.patch(
        `/api/tickets/does-not-exist-${unique()}/category`,
        { data: { category: "refund_request" } },
      );
      expect(res.status()).toBe(404);
      expect((await res.json()).error).toBe("Ticket not found");
    });
  });
});

test.describe("PATCH /api/tickets/:id/assign (API)", () => {
  test("without auth returns 401", async ({ request }) => {
    const res = await request.patch(
      `/api/tickets/does-not-exist-${unique()}/assign`,
      { data: { assignedToId: null } },
    );
    expect(res.status()).toBe(401);
  });

  test.describe("authenticated", () => {
    test.use({ storageState: ADMIN_STORAGE_STATE });

    test("400s for a nonexistent assignee", async ({ request }) => {
      const ticket = await seedTicket(request);

      const res = await request.patch(`/api/tickets/${ticket.id}/assign`, {
        data: { assignedToId: `does-not-exist-${unique()}` },
      });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe("Assignee not found");
    });

    test("404s for a nonexistent ticket", async ({ request }) => {
      const res = await request.patch(
        `/api/tickets/does-not-exist-${unique()}/assign`,
        { data: { assignedToId: null } },
      );
      expect(res.status()).toBe(404);
      expect((await res.json()).error).toBe("Ticket not found");
    });
  });
});

test.describe("Ticket list as a non-admin agent", () => {
  test.use({ storageState: AGENT_STORAGE_STATE });

  test("renders the ticket list successfully (not admin-gated)", async ({
    page,
    request,
  }) => {
    const ticket = await seedTicket(request);

    await page.goto("/");
    await expect(page).toHaveURL("/");

    // "Tickets" appears both as the NavBar link and the page heading;
    // target the second (non-link) occurrence, same convention as the
    // admin /users route-guard spec.
    await expect(page.getByText("Tickets", { exact: true }).last()).toBeVisible();
    // Column headers confirm the table (not an error state) rendered.
    for (const name of [
      "Subject",
      "From",
      "Category",
      "Status",
      "Assigned to",
      "Created",
    ]) {
      await expect(
        page.getByRole("columnheader", { name, exact: true }),
      ).toBeVisible();
    }

    await expect(rowFor(page, ticket.subject)).toBeVisible();
  });
});
