---
source: tests/e2e/specs/journeys/ac4-my-laptop-was-stolen.cy.ts
sha256: 1ec4f5c1a318706a2e2515dd3cc1295d14299eb3dcf629472c7cf5c7f900c863
signature: 1ec4f5c1a318706a2e2515dd3cc1295d14299eb3dcf629472c7cf5c7f900c863
generated_at: 2026-11-10T06:48:22.970090+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac4-my-laptop-was-stolen.cy.ts

## Purpose

End-to-end acceptance test for AC4 ("My laptop was stolen"). Verifies three session-revocation flows: logging out everywhere from one device invalidates the other, a stolen tab's session is killed immediately (401 on refresh / cleared cookie), and revoking the current session logs the tab out cleanly.

## Key elements

- **`describe('AC4 · My laptop was stolen')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset fixtures.
- **Test 1: "logging out everywhere from this tab ends the other device"** — UI-driven: clicks the logout-everywhere button and confirm dialog, then asserts `refreshDevice` returns 401 and the current tab is redirected to `/login`.
- **Test 2: "the stolen device is cut at once and cannot renew its session"** — API-driven: calls `requestAsDevice(owner, 'DELETE', '/account/sessions')`, then asserts the local tab's next navigation either gets a 401 refresh (jwt mode) or loses the `__Host-session` cookie (cookie mode), and lands on the login page with a `continue` redirect.
- **Test 3: "revoking the current session logs this tab out cleanly"** — clicks the revoke button on the current session item, asserts the nav shows the login link, the session cookie is gone, and a protected page redirects to `/login`.

## Relationships

- **`tests/support/e2e/harness.ts`** — supplies the three helpers used to simulate a second browser: `loginDevice` (performs a real login and returns a device handle with its own refresh cookie), `refreshDevice` (issues a refresh call for that device), and `requestAsDevice` (issues an arbitrary HTTP call as that device).

## Notes

- A second browser is not available in the test runner, so "two devices" are emulated: the Cypress page is one device; `loginDevice` stands in for the other.
- Test 2 branches on `cy.env(['sessionMode'])`: in `jwt` mode the refresh POST returns 401; in `cookie` mode the session cookie is simply absent. Assertions differ accordingly.
- The `requires-module: account` directive at the top of the file gates execution to environments where the account feature is enabled.
- `cy.step(...)` calls are pure annotations (no assertions); they structure the test narrative for readability in reports.
