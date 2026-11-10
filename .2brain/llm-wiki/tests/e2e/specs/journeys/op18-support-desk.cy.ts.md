---
source: tests/e2e/specs/journeys/op18-support-desk.cy.ts
sha256: 61bf92d6993b7055e713492b2909464d9be67dd5944a1b59f3e3e23210d3ef96
signature: cff9546c06a22997b8cd4775b8cd27d2aab54d2f71571c0b3706b679288ae94e
generated_at: 2026-11-10T07:13:22.051006+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op18-support-desk.cy.ts

## Purpose

End-to-end Cypress journey test covering the **support** role's full workflow: a visitor submits a contact form, support works the inbox (filter, annotate, resolve), edits a customer's phone number, and declines a return with a customer-visible reason. It also verifies what support *cannot* do (create/delete accounts, access the Audit page, reset 2FA, ban users) and confirms that every mutating action lands in the admin audit trail under the `support` role. A second spec exercises inbox pagination (10-per-page).

## Key elements

- **`VISITOR`, `NOTE`, `NEW_PHONE`, `DECLINE_REASON`, `DECLINE_MESSAGE`** – fixture constants shared across steps; the values asserted later must match what is typed earlier.
- **`AuditRowLike` / `TaskLike`** – minimal structural types for API responses so the test doesn't pull in the full domain model.
- **`writeToTheShop()`** – fills and submits the public contact form; the single "customer-created" task for the main spec.
- **`search()`** – clicks the inbox search button and calls `cy.settleNetwork()` to wait for the list to refresh.
- **`auditedAsSupport(targetId, action)`** – polls the admin audit API (via `eventually`) until a row matches the given action *and* `actorRole === 'support'`; used to assert every mutation is on record.
- **`describe('OP18 · The support desk')`** – two `it` blocks: the full role journey (main) and inbox pagination (guarded by `cy.skipUnlessDemo()`).

## Relationships

- **`tests/support/e2e/steps.ts`** – provides `adminMenuLinks()` (collects nav-link `href`s for role-permission assertions) and `eventually()` (retry-until-true helper used by `auditedAsSupport`).
- **`tests/support/e2e/harness.ts`** – provides `loginDevice(role)` and `requestAsDevice(device, method, path)` to issue an authenticated API call and assert a `403` on a forbidden action (user deactivation by support).

## Notes

- Header comment lists required backend modules (`account, tasks, observability, returns, users`); the test will fail fast if any are not seeded.
- `beforeEach` visits `/en` → `cy.restore()` → visits `/en` again to reset fixture data before every spec.
- The inbox text filter is stored in the URL, so navigating to a task detail and back preserves the narrowed list (the test relies on this).
- The pagination spec is gated behind `cy.skipUnlessDemo()`, meaning it only runs when the demo dataset (≥ 12 tasks) is available.
- Support's forbidden pages are asserted by *absence* of nav links **and** by a redirect to `#home-page` with a `.v-alert` when `/en/audit` is visited directly.
