---
source: tests/e2e/specs/journeys/ac4-my-laptop-was-stolen.cy.ts
sha256: 63ad63d2a0b7c31d5f84fe75fc6b649df7c250cf053a0edb7835d4e90fc7f14a
generated_at: 2026-10-17T02:06:24.188464+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac4-my-laptop-was-stolen.cy.ts

## Purpose

E2E journey test for AC4 ("My laptop was stolen"): verifies that a "log out everywhere" action from one device immediately invalidates all other sessions (refresh refused, next API call returns 401, user lands on login), and that revoking the current session logs the local tab out cleanly.

## Key elements

- **`describe('AC4 · My laptop was stolen')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset DB state.
- **Test 1 – "logging out everywhere from this tab ends the other device"** — logs in the page tab and a second device via `loginDevice`, confirms both sessions exist, performs a UI-driven "logout everywhere" (click + confirm dialog), then asserts the other device's `refreshDevice` now returns 401 and the page tab redirects to login.
- **Test 2 – "the stolen device is cut at once and cannot renew its session"** — simulates the stolen tab; the *owner* calls `POST /account/logout-all` via `requestAsDevice`. Asserts the stolen tab's next navigation triggers a 401 refresh (only in `jwt` session mode), shows "Your session has expired", redirects to `/login?continue=…`, and removes the user menu.
- **Test 3 – "revoking the current session logs this tab out cleanly"** — revokes the current session row from the sessions list UI; asserts the `__Host-session` cookie is gone, login link appears, and visiting a protected page redirects to login.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides the three helpers used here: `loginDevice` (creates a second authenticated browser context), `refreshDevice` (issues a refresh call as that device and returns the response), and `requestAsDevice` (makes an arbitrary API request as that device). All cross-device session assertions in this spec go through these functions.

## Notes

- The file header carries `// requires-module: account`, indicating the test depends on the `account` feature module being present.
- "Two devices" are simulated within a single browser: the page under test is one device; `loginDevice` is the other. There is no second browser instance.
- The 401-refresh assertion in Test 2 is **conditional** on `cy.env('sessionMode')` being `'jwt'`; in `cookie` mode there is no refresh step, so the check is skipped.
- Test 2 uses `cy.intercept` on `**/account/refresh` specifically to catch the proactive refresh that `jwt` mode fires before a navigation.
- The "continue" redirect in the login URL (Test 2) is an intentional UX assertion: the user should be returned to the page they were heading toward.
