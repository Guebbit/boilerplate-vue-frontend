# tests/e2e/specs/resilience.cy.ts

## Purpose

Cypress E2E spec that asserts the app *survives* its current demo dataset without naming any specific value. Where sibling specs pin exact counts, titles, and prices, this file checks structural invariants: every reachable route renders without uncaught console noise or horizontal overflow, empty lists show an empty state rather than breaking, and the pagination control agrees with the rows actually on screen. It intentionally avoids asserting "how many" so that a changed count is a signal in the value-pinning specs, not noise here.

## Key elements

- **`visitCapturingConsole(path)`** — Visits a URL, attaching `console.error`/`console.warn` interceptors in `onBeforeLoad` that push calls onto a plain array stored on the window under `__resilienceConsoleCalls`. Deliberately avoids `cy.spy()` so a cold-server dependency-discovery reload cannot silently discard the spy.
- **`assertNoConsoleNoise()`** — Reads the captured array, filters out entries matching `isKnownConsoleNoise`, and asserts zero remain.
- **`isKnownConsoleNoise(call)`** — Whitelist filter for two known non-regression logs: Grafana Faro's `"Faro"` error (no Alloy collector in plain `vite dev`) and vue-i18n's `[intlify] Not found` lazy-load warning. Must stay short and justified.
- **`assertNoHorizontalOverflow()`** — Asserts `body.scrollWidth ≤ documentElement.clientWidth + 1px` (the 1px tolerance absorbs sub-pixel rounding).
- **`assertRouteIsHealthy(path, pageAnchor)`** — Composite: visits with console capture, asserts the anchor element exists, then runs both the console-noise and overflow checks.
- **`MAX_HORIZONTAL_OVERFLOW_PX`** (1) / **`DEFAULT_PAGE_SIZE`** (10) — Tolerance and pagination threshold constants.
- **Test blocks** — Four `describe` groups:
  - *every route renders, quietly, inside the viewport* — iterates public, guest, authenticated, and admin routes via `assertRouteIsHealthy`.
  - *the catalogue renders whatever the dataset holds* — opens every admin-visible product detail page (including the `barebones` record) and asserts no overflow.
  - *lists tolerate being empty* — searches for a nonsense string and asserts the empty branch renders cleanly.
  - *pagination agrees with the rows actually rendered* — asserts the `.v-pagination` control is present iff rendered row count ≥ `DEFAULT_PAGE_SIZE`.

## Relationships

- **`src/modules/products/demo.ts`** — Source of the `barebones` product (empty description, no categories, no tags) that exercises the "sparse record" path; also provides the soft-deleted and inactive rows.
- **`src/modules/products/store.ts`** — Supplies `useServerPageTotal`, the server-reported page count that the pagination agreement check depends on.
- **`ProductsList.vue`** — Component whose `pageSizeOptions` default (10) is mirrored in `DEFAULT_PAGE_SIZE`, and whose `[data-test=list-row]` / `[data-test=row-view]` / `[data-test=filter-text]` hooks are the selectors this spec drives.
- **`stores/observability.ts`** — Grafana Faro integration whose `console.error("Faro")` output is whitelisted in `isKnownConsoleNoise`.
- **Custom Cypress commands** (`cy.resetState()`, `cy.loginAs()`) — Used in `beforeEach` and role-scoped tests; defined elsewhere in the e2e support layer.

## Notes

- **Console capture is a plain window property, not a `cy.spy`.** The first navigation against a cold `vite dev` can trigger a Vite dependency-discovery full reload that discards the window object a spy was attached to. A synchronously-reattached array in `onBeforeLoad` resets to `[]` in the worst case but can never produce a false-positive failure.
- **`isKnownConsoleNoise` is a whitelist, not a blacklist.** Adding an entry is an admission that the spec has stopped watching something. The file's own doc comment warns: an unexplained addition is how the file "quietly stops working."
- **Routes are listed manually, not discovered from the router.** Parameterized routes (`products/:id/edit`, `error/:status/:message`) are excluded because they need fixtures to be meaningful. `inventory` and `feedback` are absent because those features were in progress; add them when they land.
- **The pagination check is written as a two-way agreement** (rows ≥ page size ⇒ control exists; rows < page size ⇒ control absent) rather than a fixed expectation, so it remains meaningful as the demo catalogue grows. It caught a real bug where `pageTotal` was computed locally instead of server-reported.
- **No randomised or generated data is used.** The demo dataset already contains the awkward records by design; a generated dataset would make failures unreproducible.
