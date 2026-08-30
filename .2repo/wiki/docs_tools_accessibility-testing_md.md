# docs/tools/accessibility-testing.md

## Purpose

Documents the project's automated accessibility testing strategy: axe-based DOM auditing via Cypress e2e, a keyboard-interaction suite, and a pre-run lint pass. Explains scope, impact thresholds, reporting, state coverage, and the rationale behind each design choice so contributors know what is guaranteed, what is not, and how to extend coverage.

## Key elements

- **`sweepA11y(name, entries)`** (in `tests/support/e2e/a11y-sweep.ts`) — registers a named sweep of route entries. Each entry is either a `[label, path]` pair or an object with optional `viewport`, `theme: 'dark'`, and a `prepare()` callback that runs after content-wait and before axe.
- **`cy.checkPageA11y()`** (in `tests/support/e2e/commands.ts`) — injects axe, runs a single pass pinned to the tag list `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`. Fails on `serious`/`critical` impact; logs `minor`/`moderate` without blocking.
- **`cy.task('a11y:report', …)`** (in `tests/support/e2e/a11y-task.ts`) — writes every finding as a JSON entry to `reports/a11y/<spec-safe-name>.json`. A retried test overwrites its own entry; CI shards write to distinct files.
- **`tests/e2e/specs/a11y.cy.ts`** — the per-module sweep specs that call `sweepA11y` for each route and state they own.
- **`tests/e2e/specs/keyboard.cy.ts`** — the second, smaller suite that presses real keys to verify operability.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** — assertion that every module registers at least one sweep entry (the "upgraded central list").
- **`cy.visit()` override** (in `tests/support/e2e/commands.ts`) — shared visit helper; a past bug here caused cases to audit the previous route silently.

## Relationships

- **`tests/support/e2e/a11y-sweep.ts`** — defines `sweepA11y()` and the entry-type contract (pair vs. object with `viewport`/`theme`/`prepare`). All spec files consume this helper.
- **`tests/support/e2e/a11y-task.ts`** — implements the `cy.task` handler that `cy.checkPageA11y()` calls to persist findings as JSON; no other code writes to `reports/a11y/`.
- **`tests/support/e2e/commands.ts`** — hosts `cy.checkPageA11y()`, the `cy.visit()` override, and the content-wait helper. Both the a11y and keyboard specs depend on these commands.
- **`tests/e2e/specs/a11y.cy.ts`** / **`keyboard.cy.ts`** — the executable specs that the docs describe; changes to either should be reflected here.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** — cross-module assertion that reads the registered sweeps; adds a route without a sweep entry and this spec fails.
- **`package.json`** — pins `axe-core` / `@axe-core/playwright` versions; the docs note that unpinning would drift the rule set.
- **`docs/tools/component-testing.md`** — sibling documentation page; cross-referenced for the `cy.visit()` bug story and for the broader testing-landscape context.

## Notes

- **Floor, not ceiling.** Automated rules catch roughly 30–40 % of real a11y issues. Passing the suite does not mean the app is accessible; keyboard and screen-reader walkthroughs remain necessary.
- **Impact gate is deliberate.** Only `serious`/`critical` fail the run. Lower-impact findings are logged to JSON so a future threshold change is data-driven, not a rediscovery.
- **Rule set is tag-pinned, not version-pinned.** An `npm update` of `axe-core` cannot silently add or remove rules. Widening the set is an edit to one tag list.
- **No exclusions, no suppressed rules.** The BUILT bundle served by `vite preview` excludes dev-only markup. If an exclusion ever becomes necessary, exclude the element selector — never the rule globally.
- **Content wait is mandatory.** Every case waits for `cy.get('h1')` (or equivalent) before running axe. Auditing a loading skeleton produces a vacuous green.
- **Per-module sweeps, not one central list.** Routes belong to modules; orphaned central entries would break on module deletion. The coverage spec provides the "readable list" guarantee.
- **Reports are gitignored and CI-uploaded.** The `a11y-reports` artifact is uploaded on every run (green included) so the data from a passing run is preserved.
- **`prepare()` is plain Cypress commands**, enqueued in order after the content wait. Use it for click-to-reveal states (drawers, dialogs, menus) so axe audits the DOM a visitor can actually reach.
