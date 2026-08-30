# tests/e2e/specs/resilience.cy.ts

## Purpose

Cypress e2e spec that verifies the application survives *any* dataset without visible breakage. Unlike the value-pinning specs (exact counts, titles, prices), this file asserts only structural health: pages render, log nothing unexpected, do not overflow horizontally, handle empty states, and keep pagination consistent with visible rows. It exists to catch the class of bugs a fixed-dataset spec cannot see—broken images, silent TypeErrors, a table 300 px past the viewport.

## Key elements

- **`MAX_HORIZONTAL_OVERFLOW_PX`** (1) – Tolerance for sub-pixel rounding before a page is flagged as overflowing.
- **`DEFAULT_PAGE_SIZE`** (10) – Mirrors `ProductsList.vue`'s `pageSizeOptions` default; used in the pagination assertion.
- **`isKnownConsoleNoise`** – Filters out Grafana Faro's `"Faro"` error and vue-i18n's `[intlify] Not found` warning so they don't mask real regressions (or vice-versa).
- **`CONSOLE_CAPTURE_KEY`** / **`ConsoleCall`** / **`WindowWithConsoleCapture`** – A plain `win` property (not `cy.spy`) that accumulates `console.error`/`warn` calls. A spy would be silently discarded on a cold-server dependency-discovery reload.
- **`visitCapturingConsole(path)`** – Wraps `cy.visit` with `onBeforeLoad` to attach the capture array and wrap `console.error`/`console.warn`.
- **`assertNoConsoleNoise()`** – Reads the captured calls from the window and asserts none are unexpected (after filtering known noise).
- **`assertNoHorizontalOverflow()`** – Asserts `body.scrollWidth ≤ documentElement.clientWidth + 1`.
- **`assertRouteIsHealthy(path, pageAnchor)`** – Combines the above: visit, assert anchor exists, no console noise, no overflow.
- **`describe('Resilience')`** – Top-level suite with four inner suites:
  - *every route renders, quietly, inside the viewport* – Iterates public, guest, authenticated, and admin routes via `assertRouteIsHealthy`.
  - *the catalogue renders whatever the dataset holds* – Opens every admin-visible product detail page (including the sparse `barebones` record) and checks overflow.
  - *lists tolerate being empty* – Searches for a nonexistent product to exercise the empty-list branch.
  - *pagination agrees with the rows actually rendered* – Asserts `.v-pagination` presence is consistent with whether row count ≥ `DEFAULT_PAGE_SIZE`.

## Relationships

No graph neighbors are recorded for this file. It depends only on the running demo backend (`cy.resetState()`, `cy.loginAs(...)`) and the DOM anchors of the pages under test; it imports nothing from the application source.

## Notes

- **No value assertions by design.** Counts, titles, and prices are deliberately absent; a changed count is a signal for the value-pinning specs, not noise here.
- **Console capture is a plain property, not a spy.** A `cy.spy` attached in `onBeforeLoad` can be lost when Vite's dependency-discovery triggers a full page reload on the first cold request. The array approach degrades to an empty list (no false failure) in that edge case.
- **Known-noise list is intentionally short.** Adding an entry means this spec has *stopped watching* something; every addition should carry a justification comment.
- **`inventory` and `feedback` routes are omitted** because those features were still in progress at the time of writing; they should be added to the route list once shipped.
- **`barebones` product** (in the backend's `src/modules/products/demo.ts`) is the deliberately sparse record—no description, no categories, no tags—that exercises the "optional fields at schema defaults" path. Case 6 (admin detail-page loop) is the one that hits it.
- **Pagination assertion is written as a relationship** (rows ≥ page size ⟹ control exists; rows < page size ⟹ control absent) rather than a fixed expectation, so it remains meaningful as the demo catalogue grows.
