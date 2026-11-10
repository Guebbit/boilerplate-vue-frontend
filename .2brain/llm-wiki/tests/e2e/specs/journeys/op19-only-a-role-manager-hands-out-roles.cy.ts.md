---
source: tests/e2e/specs/journeys/op19-only-a-role-manager-hands-out-roles.cy.ts
sha256: 347ce4287c9e8043aca46fe08c65d5d5ffb10c9b702cc9305172180fa3a550a8
signature: 2d59fbe9a18769c4765bc675dd8ccff00c45bc0e39f33e1bb9ff13ec1bf466b6
generated_at: 2026-11-10T07:13:36.223227+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op19-only-a-role-manager-hands-out-roles.cy.ts

## Purpose

End-to-end test for the OP19 access-control rule: only a role manager (the administrator) may assign or revoke staff roles. It verifies that the UI hides role controls from lower-privilege actors, that the server rejects unauthorized `assign-role` / `revoke-role` / `deactivate` / `PATCH` calls with `403 ROLE_MANAGEMENT_REQUIRED`, that an admin promotion takes effect on next sign-in (after authenticator enrollment), and that both grants and refusals are recorded in the audit trail.

## Key elements

- **`grantRole(userId, role)`** — Opens the user's page, selects a role in the access dialog, confirms, and waits for the `POST /users/*/assign-role` interception.
- **`roleIs(userId, role)`** — Reads the user via `cy.apiAs('admin', …)` and asserts the `role` field matches the expected value (or is absent).
- **`roleRefusedByHand(userId, role, as)`** — Logs in as the given role, fires a direct `POST /users/{id}/assign-role`, expects `403`, then re-asserts the role is unchanged.
- **`noRoleOffered(userId, role, as)`** — For a moderator: asserts the role picker is disabled in the UI, then delegates to `roleRefusedByHand`.
- **`noDoorOffered(userId, role, as)`** — For support: asserts the access-door element does not exist at all, then delegates to `roleRefusedByHand`.
- **`describe('OP19 …')`** — Three `it` blocks:
  1. Moderator/support are refused; admin promotes to `warehouse`; promoted user sees the warehouse menu after `enrolAuthenticatorApp`; audit row `access.role.assigned` written by admin.
  2. Moderator cannot demote an admin (no UI door + `403` on `revoke-role`).
  3. Support and moderator cannot edit, deactivate, or create-with-role a staff account; admin can; refusals appear as `security.forbidden / role_protected` audit rows.
- **`UserLike` / `AuditRowLike`** — Minimal read-side type shapes for API assertions.

## Relationships

| Neighbor | Interaction |
|---|---|
| `tests/support/e2e/steps.ts` | Imports `adminMenuLinks`, `eventually`, `refusedWith` for UI assertions, polling audit entries, and generic 403 checks. |
| `tests/support/e2e/harness.ts` | Imports `loginDevice` and `requestAsDevice` to perform authenticated API calls as a specific seeded role. |
| `tests/support/e2e/security-steps.ts` | Imports `enrolAuthenticatorApp` to arm the promoted user's 2FA so the staff menu appears. |
| `tests/support/scenario-description.ts` | Imports the `E2ERole` type to type the `as` parameter in helper functions. |

## Notes

- The `requires-module: account, inventory, users` pragma tells the test runner which server modules must be booted; omitting it would cause missing endpoints.
- `beforeEach` calls `cy.restore()` between tests to reset seeded accounts, then re-visits `/en` to prime the session.
- `eventually` is used for audit-trail assertions because the audit write is asynchronous relative to the triggering request; the helper polls until the row appears or times out.
- The third test creates a throwaway `walk-in@example.test` customer mid-flight; it is cleaned up only by `cy.restore()` in the next `beforeEach`.
- All UI assertions target `data-test` attributes (e.g. `user-manage-access`, `user-access-role`), not visible text, so copy changes won't break the spec.
