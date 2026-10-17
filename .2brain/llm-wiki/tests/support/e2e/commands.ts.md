---
source: tests/support/e2e/commands.ts
sha256: 976eb88dac5b756a1ca73b0dd6144daa7fe2c0b74256f63ee3b3467411f3f935
generated_at: 2026-10-17T02:24:47.236115+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/commands.ts

## Purpose

Defines the full set of custom Cypress commands available to every e2e spec in this project. It augments the global `Cypress.Chainable` interface so specs can call semantic actions (`cy.loginAs()`, `cy.restore()`, `cy.emailTo()`, …) instead of repeating low-level selectors and API calls. The file also centralises timeout budgets and the two reset strategies (demo vs. live) behind a single `cy.restore()` entry point.

## Key elements

- **Timeout constants** — `DEMO_RESET_TIMEOUT_MS` (30 s), `APP_READY_TIMEOUT_MS` (15 s), `LIVE_RESET_TIMEOUT_MS` (60 s). Used internally by `restore` and navigation helpers.
- **`Cypress.Chainable` augmentation** (via `declare global`) — the type declarations for every custom command listed below. Specs get autocomplete and type safety from this block.
- **`restore(scenario?)`** — Resets backing data. Demo profile: `POST /__test/restore`. Live profile: shells out to the backend's restore command via `withScenario`. Also clears the Chromium HTTP cache.
- **`loginAs(role?)` / `switchUser(role?)`** — UI-driven login. `switchUser` logs out and back in within the same tab (no `cy.visit`) to prove state handoff.
- **`trackNetwork()` / `settleNetwork()`** — Pairs of commands: start counting API requests before a visit, then wait until no tracked request is in flight for two consecutive polls.
- **`freezeAnimations()` / `freezeForVisual(isoTime?)`** — Strip transitions/animations; the latter also freezes the clock, caret, and dev overlay for stable screenshots.
- **`compareSnapshot(name)`** — Screenshots the viewport and diffs against a committed baseline in a sibling `__snapshots__` folder.
- **`checkPageA11y(context?)`** — Runs axe; fails on `serious`/`critical` violations only.
- **`skipUnlessLive()` / `skipUnlessDemo()` / `skipUnlessMailbox()`** — Profile-gate tests so they are reported as skipped (not faked green) when the current profile cannot satisfy them.
- **`emailTo(address, matches?)` / `emailAbout(subject)` / `sentSubjects()`** — Read the newest email from the demo outbox or Mailpit (live), or list all subjects. Poll until a match arrives.
- **`navigateTo(path)` / `navigateViaMenu(menu, path)`** — Follow main-nav or menu entries by their `href` (locale-stable) rather than by label.
- **`logout()` / `goToCart()`** — Shortcuts for common nav-bar interactions.
- **`textareaIn(testId)`** — Unwraps Vuetify's nested `<textarea>` under a `data-test` wrapper.
- **`checkoutWith(method)`** — Selects a shipping method and completes checkout from the cart.
- **`pickOption(activatorSelector, label)`** — Opens a Vuetify select/autocomplete and picks an option by ARIA role + label.

## Relationships

- **`scripts/e2e/reset-command.ts`** — Imports `withScenario`, which executes the live-profile reset (shells out to the backend's restore command).
- **`scripts/e2e/mail-message.ts`** — Imports `parseMailpitMessage` and the `MailedEmail` type used by the `emailTo` / `emailAbout` / `sentSubjects` commands.
- **`./scenario`** (sibling, not listed as a neighbor) — Imports `loadScenario`, `seedAccount`, and the `E2ERole` type used by `loginAs` / `switchUser`.
- **`../stub`** (sibling) — Imports `asStub` for demo-profile mocking.
- **All `.cy.ts` spec files** (account tests, journey specs, AC-level journey specs) — Consume the commands defined here; they are the sole callers of every `cy.*` helper in this file.

## Notes

- **Profile dichotomy is pervasive.** Almost every command behaves differently under `demo` vs. `live`. The skip helpers (`skipUnless*`) exist so specs can declare applicability without conditional logic inside the test body.
- **`trackNetwork()` must be called before `cy.visit()`.** An intercept registered after navigation misses mount-time requests; the JSDoc calls this out explicitly.
- **`restore` clears the HTTP cache (Chromium only).** Without this, cached `GET` responses from the previous scenario leak into the new one.
- **Timeouts are deliberately generous** to absorb cold-start costs (first demo build, `tsx` startup, CI disk I/O) rather than to reflect typical runtime.
- **Navigation helpers key on `href`, not label.** The main nav bar is icon-only; labels are tooltips / `aria-label`s that are translated, so they are unreliable selectors.
- **The file content shown is truncated**; the `pickOption` JSDoc is cut off mid-sentence, implying additional commands or implementation details follow beyond what is visible here.
