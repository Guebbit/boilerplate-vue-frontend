---
source: tests/e2e/specs/journeys/at11-a-staff-member-walks-away.cy.ts
sha256: 0b6510eb6cc8fd8b01f86d726a551c8ed98dba35d8f6ead1c32fef14bd5afaa3
signature: 0b6510eb6cc8fd8b01f86d726a551c8ed98dba35d8f6ead1c32fef14bd5afaa3
generated_at: 2026-11-10T06:50:08.893432+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at11-a-staff-member-walks-away.cy.ts

## Purpose

End-to-end test for acceptance test **AT11** (idle session timeout). Verifies that shopper sessions never idle out while staff sessions expire after 30 minutes, that the "Still there?" prompt appears in the final two minutes, that "Stay signed in" resets the clock, that ignoring the prompt signs the user out and redirects to login (remembering the originating page), and that the **server** enforces the limit independently of the tab (returning `SESSION_IDLE` / 401).

## Key elements

- **`PAST_IDLE_MS` (31 min), `BEFORE_WARNING_MS` (27 min), `INTO_WARNING_MS` (90 s)** – time-travel offsets chosen to land just past the 1800 s staff idle limit, inside the limit but outside the 2-min warning window, and long enough to cross into that window.
- **`ENDED`** – the toast text shown when a session is force-ended by inactivity.
- **`SIGN_IN`** – regex matching both the password step and the optional `/2fa` code step of the login POST.
- **`DIALOG`** – `[data-test=idle-session-dialog]` selector for the "Still there?" prompt.
- **Test: "a shopper is never asked"** – logs in as `user`, asserts `idleTimeoutSeconds` is `undefined`, travels past the idle window, confirms no dialog and the account page still loads.
- **Test: "a staff member is asked, can stay, and is signed out"** – logs in as `warehouse` (two-step: password → TOTP), asserts `idleTimeoutSeconds === 1800`, triggers the dialog, clicks "Stay signed in" and verifies the clock resets, then lets the session idle out, verifies the redirect to `/login?continue=…`, re-authenticates (including TOTP via `answerChallengePage`), and confirms only one session is listed.
- **Test: "the server decides"** – signs in on a second device (`loginDevice`), travels **only** the server clock (`cy.travel`), verifies the tab shows no dialog but the next navigation is refused with the `ENDED` toast and `#login-page`; then checks the second device is also refused (401 + `SESSION_IDLE`), branching on `sessionMode` (`jwt` → `refreshDevice`, `cookie` → `requestAsDevice`).
- **Test: '"Sign out" in the prompt leaves at once'** – triggers the dialog and clicks "Leave", asserting immediate sign-out.

## Relationships

- **`tests/support/e2e/harness.ts`** – provides `loginDevice` (create a second-device session), `refreshDevice` (refresh a JWT on that device), and `requestAsDevice` (issue a raw request as a cookie device). Used in the server-authority test to prove the limit is enforced per-device, not per-tab.
- **`tests/support/e2e/login-challenge.ts`** – provides `answerChallengePage`, which solves the TOTP code step that a staff account requires after the password. Called in the re-authentication step of the "staff member is asked…" test.

## Notes

- **Demo-only:** every test calls `cy.skipUnlessDemo()` in `beforeEach`; the file must not run in production or CI without the demo clock.
- **Dual-clock travel:** the first two tests use `cy.travelEverywhere` (advances both browser `Date` and the server demo clock simultaneously). The server-authority test deliberately uses `cy.travel` (server clock only) so the tab never sees the timeout—proving the server is the real authority.
- **Single-jump trick:** when entering the warning window, the test travels `BEFORE_WARNING_MS + INTO_WARNING_MS` in one step rather than two, because an intermediate request would count as activity and restart the idle clock.
- **Staff login is two-step:** the `SIGN_IN` intercept fires twice for `warehouse` (password, then TOTP). Tests must `cy.wait('@signIn')` twice before asserting on the session response body.
- **`sessionMode` branch:** in JWT mode the access token lapses at refresh time; in cookie mode the idle check hits on the request itself. The test asserts the same `SESSION_IDLE` outcome either way.
