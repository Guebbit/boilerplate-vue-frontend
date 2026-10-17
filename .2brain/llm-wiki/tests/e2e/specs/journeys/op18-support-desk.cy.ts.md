---
source: tests/e2e/specs/journeys/op18-support-desk.cy.ts
sha256: 933e350469a983acdd2afd16e135166f5e4e76175ab32f93266f1398d3947b31
generated_at: 2026-10-17T02:20:06.614345+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op18-support-desk.cy.ts

## Purpose

End-to-end Cypress journey that exercises the **support** role against a live application. It verifies that support can work the feedback inbox (filter, annotate, resolve), edit a customer's phone number, and decline a return with a customer-visible reason — while confirming what support *cannot* do (create/delete users, reset 2FA, ban, or open the Audit page). Every permitted action is cross-checked against the admin audit trail.

## Key elements

- **`writeToTheShop()`** — Fills the public contact form (`/en/contact`) and asserts no submit error appears.
- **`search()`** — Clicks the inbox search button and waits for the network to settle.
- **`auditedAsSupport(targetId, action)`** — Polls (via `eventually`) the admin audit API until a row matching the given `action` and `actorRole: 'support'` appears for the target.
- **`adminMenuLinks()`** — Opens the admin navigation menu, collects all link `href` values, closes the menu with Escape, and returns the array as a chainable.
- **`AuditRowLike` / `TicketLike`** — Minimal structural types the story reads from API responses.
- **Constants `VISITOR`, `NOTE`, `NEW_PHONE`, `DECLINE_REASON`** — Fixture data shared across steps within the single test.
- **Test 1: "support works the inbox…"** — The main journey: contact → inbox filter/annotate/resolve → user edit (phone) → return decline → audit verification.
- **Test 2: "the inbox is paged…"** — Seeds 12 tickets via API and asserts 10 on page 1, 2 on page 2 (skipped unless `skipUnlessDemo()` passes).

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `eventually`, the polling helper used by `auditedAsSupport` to wait for an audit row to appear.
- **`tests/support/e2e/harness.ts`** — Imports `loginDevice` (to obtain a support-role device token for a direct API call) and `requestAsDevice` (to send a PATCH that must return 403, proving the server enforces the ban restriction even when the UI hides the button).

## Notes

- **Fixture lifecycle:** `beforeEach` calls `cy.restore()` after visiting `/en`, implying a custom fixture-reset command; the tests depend on a clean database per run.
- **Filter persistence in URL:** The inbox text filter is stored in the address bar, so a page reload preserves the narrowed list — the test explicitly reloads to confirm this.
- **Negative assertions are first-class:** The test spends significant space verifying what is *absent* (no delete button, no create link, no 2FA reset, no ban, no audit menu entry, audit page redirects to home with an alert).
- **`cy.skipUnlessDemo()`** guards the pagination test, which requires enough seed data to exceed one page (10/page).
- **Direct API 403 check:** After confirming the UI lacks a ban control, the test also fires a raw `PATCH /users/:id { active: false }` through `requestAsDevice` to assert the server independently rejects the operation.
