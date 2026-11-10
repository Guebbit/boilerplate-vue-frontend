---
source: tests/e2e/specs/journeys/op37-the-manager-exports-what-the-filter-shows.cy.ts
sha256: 8e5da419baeb6c497de336ddbe43993e841fdc334fdab50b7fa40ad0107049f7
signature: 8e5da419baeb6c497de336ddbe43993e841fdc334fdab50b7fa40ad0107049f7
generated_at: 2026-11-10T07:17:49.459189+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op37-the-manager-exports-what-the-filter-shows.cy.ts

## Purpose

End-to-end test verifying that when a manager filters the orders list to "Paid" and clicks Export, the browser-downloaded CSV is byte-for-byte identical to the server response, contains exactly one line per listed order (plus a header), and includes every order number visible on screen. It deliberately avoids any CSV parsing, relying only on string equality and substring checks.

## Key elements

- **`beforeEach`** — Visits `/en`, restores state, logs in as `manager`, and navigates to `/en/sales/orders`.
- **`it('saves the server's CSV, one line per listed order')`** — The single test case. It filters to Paid, clicks `[data-test=orders-export]`, intercepts the export request, then:
  - Asserts HTTP 200 and that the `Content-Disposition` filename matches `orders-YYYY-MM-DD.csv`.
  - Strips the BOM (`\uFEFF`) from both the served body and the downloaded text before asserting they are equal.
  - Cross-checks line count against `GET /orders?status=paid&pageSize=100` via `cy.apiAs`.
  - Asserts each `[data-test=row-order-number]` element's text appears as a substring in the saved file.
- **`listedIds()`** (imported) — Collects order IDs from the currently listed rows.
- **`submitSearch()`** (imported) — Triggers the filter/search form submission.
- **`downloadedText(name)`** (imported) — Reads the text of the file the browser has saved under the given name.

## Relationships

- **`tests/support/e2e/steps.ts`** — Provides the three helpers `downloadedText`, `listedIds`, and `submitSearch` used throughout this spec. No other files are imported.

## Notes

- **BOM handling:** The server prepends a UTF-8 BOM so spreadsheets detect the encoding. `cy.readFile` (via `downloadedText`) preserves it, while `response.body` is already a string. Both sides strip the leading `\uFEFF` before comparison; the saved file still contains the BOM in reality.
- **No CSV parser:** By design, the test uses only `.to.equal()` and `.to.contain()` assertions. Adding a parser would be unnecessary and could introduce false failures.
- **Cross-check via API:** The row-count assertion calls the same filtered endpoint the page hits (`/orders?status=paid`) through `cy.apiAs`, tying the UI list length to the server's item count independently of the export response.
- **Module tag:** The `requires-module: account, orders` comment at the top indicates this test depends on both the account (auth) and orders service modules being available.
