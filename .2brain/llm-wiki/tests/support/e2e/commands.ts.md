---
source: tests/support/e2e/commands.ts
sha256: d709dcb670834a06f89b5e0c7639ba7c1f029eea4026af8a310da9936709f7b4
signature: d7cf320836dd449471f470134b9947545d6c7a71bfc311f1ce041b237a1d98b1
generated_at: 2026-11-10T07:28:13.876328+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/commands.ts

## Purpose

Cypress custom-command definitions for the e2e test suite. It registers a set of high-level, reusable actions (restore, login, navigation, mail inspection, visual comparison, a11y checks, network settling, etc.) onto Cypress's global `Chainable` so that every spec and journey file can express intent in one line rather than repeating multi-step UI sequences. It also declares the TypeScript types for those commands via `declare global` merging.

## Key elements

- **`restore(scenario?)`** — Resets the backend to a named scenario. Demo profile: `POST /__test/restore`. Live profile: shells out to a user-supplied command via `withScenario`. Also clears Chromium's HTTP cache.
- **`loginAs(role?)`** — Full UI login flow (visit `/en/login`, fill form, submit).
- **`loginAsFast(role?)`** — Bypasses the UI: one `POST /account/login`, sets session + `isAuth` cookies directly. For batch sweeps.
- **`switchUser(role?)`** — Logs out and logs in a different role in the same tab without a full page reload, exercising session-store and router-guard teardown.
- **`trackNetwork()` / `settleNetwork()`** — Pair: register an intercept before `cy.visit()`, then wait until no tracked request is in flight for two consecutive polls.
- **`freezeAnimations()` / `freezeForVisual(isoTime?)`** — Strip CSS transitions/animations; the latter also freezes the clock, caret, and dev-server overlay for deterministic screenshots.
- **`compareSnapshot(name)`** — Viewport screenshot vs. committed baseline in `__snapshots__/` beside the spec.
- **`checkPageA11y(context?)`** — Runs axe; fails on `serious`/`critical` violations only.
- **`skipUnlessLive()` / `skipUnlessDemo()` / `skipUnlessMailbox()`** — Profile-conditional skip guards.
- **`emailTo(address, matches?)` / `emailAbout(subject)` / `sentSubjects()`** — Read the newest (or matching) email from the demo outbox (`/__test/emails`) or live Mailpit API; `sentSubjects` returns all subjects for negative assertions.
- **`navigateTo(path)` / `navigateViaMenu(menu, path)` / `logout()` / `goToCart()`** — Nav-bar interaction helpers keyed on `href` (locale-stable) rather than translated labels.
- **`textareaIn(testId)`** — Resolves the inner `<textarea>` under a Vuetify `data-test` wrapper.
- **Timeout constants** — `DEMO_RESET_TIMEOUT_MS` (30 s), `APP_READY_TIMEOUT_MS` (15 s), `LIVE_RESET_TIMEOUT_MS` (60 s), each with a comment explaining the headroom rationale.
- **`declare global { namespace Cypress { interface Chainable { … } } }`** — The TypeScript typing block that makes every above command visible to specs without imports.

## Relationships

- **`scripts/e2e/reset-command.ts`** — Provides `withScenario`, the live-profile restore mechanism (shells out to the backend's own restore command, reading `LIVE_RESET_COMMAND` from `.env`).
- **`scripts/e2e/mail-message.ts`** — Provides `parseMailpitMessage` and the `MailedEmail` type used by the mail commands.
- **`scripts/e2e/contract-mismatch.ts`** — Provides `isContractMismatch`, a predicate used internally to guard flows against schema drift.
- **`scripts/e2e/mail-filters.ts`** — Source of the `MailFilter` type accepted by `emailTo`.
- **`tests/e2e/specs/journey.cy.ts`** — Consumer spec; exercises multiple commands in sequence across the full journey.
- **`tests/e2e/specs/journeys/ac1-lost-my-phone.cy.ts`** — Consumer journey spec; relies on `loginAs`, `emailTo`, `restore`, and navigation commands.
- **`tests/e2e/specs/journeys/ac13-my-password-start-to-finish.cy.ts`** — Consumer journey spec; exercises `emailTo`, `restore`, `navigateTo`, and login helpers.
- **`tests/e2e/specs/journeys/ac16-two-factor-awkward-edges.cy.ts`** — Consumer journey spec; uses `restore`, `emailTo`, `switchUser`, and navigation commands.
- **`tests/e2e/specs/journeys/ac20-the-link-in-my-mail-went-stale.cy.ts`** — Consumer journey spec; relies on `emailTo`, `restore`, and `navigateTo`.
- **`tests/e2e/specs/journeys/ac21-it-was-not-me.cy.ts`** — Consumer journey spec; exercises `loginAs`, `restore`, and nav helpers.
- **`tests/e2e/specs/journeys/ac22-i-disconnected-the-provider.cy.ts`** — Consumer journey spec; uses `restore`, `navigateViaMenu`, and `logout`.
- **`src/modules/account/tests/e2e/password-reset.cy.ts`** — Consumer spec; uses `restore`, `emailTo`, `loginAs`, and navigation commands.
- **`src/modules/account/tests/e2e/profile.cy.ts`** — Consumer spec; exercises `loginAs`, `navigateTo`, and `settleNetwork`.
- **`src/modules/account/tests/e2e/registration.cy.ts`** — Consumer spec; relies on `restore`, `emailTo`, `loginAs`, and `trackNetwork`/`settleNetwork`.
- **`src/modules/account/tests/e2e/two-factor.cy.ts`** — Consumer spec; uses `restore`, `emailTo`, `loginAs`, and `switchUser`.

All consumer specs import nothing directly from this file; the commands are globally available once the Cypress support file loads it.

## Notes

- **Demo vs. live profile** is the central axis. Several commands behave differently per profile (restore, mail reading) or are profile-exclusive (`skipUnlessLive`, `skipUnlessDemo`). The profile is set via the `npm run test:e2e` / `test:e2e:live` scripts.
- **`trackNetwork()` must be called *before* `cy.visit()`**; registering the intercept after navigation silently misses mount-time requests.
- **`sentSubjects()` is only valid *after* a positive mail assertion has already passed**, to avoid a false-negative where "no mail has arrived yet" is indistinguishable from "no mail will ever arrive."
- **Navigation helpers key on `href` (locale-prefixed path)**, not visible text, because the nav bar is icon-only with translated tooltips/aria-labels. The path is the stable, locale-independent identity.
- **`loginAs` vs. `loginAsFast` vs. `switchUser`** serve distinct testing goals: full UI fidelity, speed for multi-persona sweeps, and same-tab session handoff correctness respectively. Using the wrong one silently weakens the assertion being made.
- The file is truncated in this snapshot; the actual file contains additional commands (e.g. checkout flows) beyond `textareaIn`.
