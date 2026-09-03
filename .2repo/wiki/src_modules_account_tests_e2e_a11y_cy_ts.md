# src/modules/account/tests/e2e/a11y.cy.ts

## Purpose

Declares the list of routes, states, and fixture contexts that the account module submits to the shared accessibility sweep. It contains no audit logic itself — that lives in `a11y-sweep.ts` — but co-locating the route list here means deleting the account module also removes its a11y coverage, and `tests/cross-cutting/a11y-coverage.spec.ts` enforces that every routed module has one of these files.

## Key elements

- **`UNISSUED_TOKEN`** (`const`) — A sentinel token (`'a-token-nobody-issued'`) appended to confirm-page URLs. Lets the sweep audit the "expired-link" rendering state (form visible, token prefilled, other fields empty) without consuming a real one-time token.
- **`sweepA11y('account — guest', …)`** — Registers guest-facing routes: login, signup, password-reset, three confirm pages (each with `UNISSUED_TOKEN`), the OAuth error callback, login in dark theme, and login in its "submitted empty" error state (via a `prepare` callback that clicks submit and waits for `.v-messages__message`).
- **`sweepA11y('account — signed in', …, 'user')`** — Registers authenticated routes under the `'user'` fixture: the profile page and the profile with the address dialog open (opened via `prepare` clicking `[data-test=address-add]`).

## Relationships

- **Imports `sweepA11y`** from `tests/support/e2e/a11y-sweep.ts` — the sole mechanism this file calls. Each `sweepA11y` call passes a label, an array of route descriptors (either `[name, url]` or `{name, route, theme?, prepare?}`), and an optional fixture name.
- **Referenced by `tests/cross-cutting/a11y-coverage.spec.ts`** (noted in the module doc-block) — that spec asserts every routed module ships a co-located a11y sweep file like this one, preventing silent loss of coverage.

## Notes

- The OAuth *success* callback is deliberately excluded: it redirects immediately and renders no own UI. Only the error state (`?error=access_denied`) is audited.
- The "submitted empty" login entry uses `cy.get('form button[type=submit]').click()` inside `prepare`; the assertion that `.v-messages__message` is visible acts as a readiness gate before the a11y scanner runs.
- Route entries can be a simple `[name, url]` tuple or an object with optional `theme` and `prepare` fields — both shapes are mixed within the same array.
- The `'user'` string as the third argument to `sweepA11y` is a fixture selector, not a route or role name.
