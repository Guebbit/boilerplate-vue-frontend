# docs/reference/tests.md

## Purpose

Catalog of every test file in the repository, mapping each to the single guarantee it enforces. It exists so a reader can identify *which* test covers a given rule without opening the spec itself.

## Key elements

- **Suite split rule** — single-module tests are co-located inside the module; system-level tests (infrastructure, kernel, app shell, cross-module rules) live under `tests/`.
- **Runner ownership** — Vitest (jsdom) owns unit and cross-cutting suites; Cypress owns `tests/e2e/` and `tests/e2e/visual` (pixel baselines).
- **`tests/cross-cutting/`** — one spec per architectural rule, asserted over all fourteen modules at once. Documented specs: `registry`, `published-language`, `form-idiom`, `store-location`, `schemas-i18n`, `a11y-coverage`, `coverage-and-mutate-scope`, `mutation-safe-imports`.
- **`tests/unit/`** — organized by area: `kernel/`, `app/` (router, guards, navigation), `infrastructure/` (http, i18n, stores, composables, utils), `ui/`, `scripts/`. Each row names the specific behavior locked in.
- **`tests/support/`** — harness code (e.g. `unit/wire-modules.ts`, `e2e/commands.ts`) that wires fixtures or extends commands; contains no assertions itself.
- **`tests/e2e/specs/`** — browser-level tests that hit the paired backend's demo profile (mock layer retired).

## Relationships

- **`docs/reference/src-modules.md`** — cross-cutting specs (`registry`, `published-language`) assert invariants about module manifests and barrels; "Read next" links in this file point to module theory.
- **`docs/reference/src-ui.md`** — `form-idiom.spec.ts` enforces the `useAppForm` idiom; `use-upload-progress.spec.ts` covers a UI-kit composable.
- **`tests/cross-cutting/form-idiom.spec.ts`**, **`registry.spec.ts`**, **`published-language.spec.ts`**, **`store-location.spec.ts`** — the four cross-cutting specs whose guarantees are itemized in the table on this page.
- **`tests/unit/infrastructure/http/`** — seven specs (client, http, http-request, http-refresh, http-validate-responses, url, response-schema-map) are listed with their individual guarantees.
- **`tests/unit/infrastructure/stores/`** — `session.spec.ts` and `observability.spec.ts` are cataloged.
- **`tests/support/unit/wire-modules.ts`** and **`tests/support/e2e/commands.ts`** — referenced as the harness layer that feeds the unit and e2e suites without asserting.
- **`tests/e2e/specs/`** — the destination of the Cypress flow; described as requiring a real browser *and* a real backend.

## Notes

- `context-map.spec.ts` and `subdomain-discipline.spec.ts` **no longer exist**. Their coupling check was promoted to the `MODULE_EDGES` ESLint rule in `eslint.config.ts`; the structural half was deleted along with the `dependsOn`/`subdomain` fields.
- New modules are automatically covered by cross-cutting tests "the day they are added" — no per-module opt-in needed.
- The e2e suite talks to the paired backend's **demo profile**; the previous in-repo mock layer has been retired.
- `formatters.property.spec.ts` uses property-based testing (generated inputs) rather than example-based assertions — a distinct technique called out explicitly in the table.
