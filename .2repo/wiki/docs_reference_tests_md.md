# docs/reference/tests.md

## Purpose

Reference index for the project's test architecture. It names every test file and the single guarantee each one provides, so a reader can locate *which* test covers a given rule without reading the specs themselves. It also records the two-level placement convention (co-located vs `tests/`) and which runner (Vitest or Cypress) owns which scope.

## Key elements

- **Placement rule** — module-scoped tests live inside the module; system-scoped tests (infrastructure, kernel, app shell, cross-module invariants) live under `tests/`.
- **`tests/support/`** — shared harness (fixtures, helpers); contains no assertions.
- **`tests/cross-cutting/`** (8 files) — one spec per architectural rule asserted over all fourteen modules simultaneously. Covers: registry invariants, published-language (barrel) discipline, `useAppForm` idiom, store file location, schema→i18n key resolution, a11y route coverage, coverage/Stryker scope sync, and mutation-safe import patterns.
- **`tests/unit/kernel/`** — registry route/navigation collection on synthetic modules.
- **`tests/unit/app/`** — router assembly, navigation model, auth guards, locale-choice, shell navigation.
- **`tests/unit/infrastructure/`** — HTTP client/transport/request/refresh/validation, URL normalisation, response-schema map, i18n resolution & admin overrides, session store, observability wiring, SSE client, upload progress, error formatting, formatters (+ property-test variant), logger, upload limits.
- **`tests/unit/ui/` and `tests/unit/scripts/`** — UI component and build-script tests (content truncated in source).
- **Runner split** — Vitest + jsdom for everything up to single-component mounts; Cypress for real-browser / real-backend e2e and visual-regression (pixel baselines).

## Relationships

- **`docs/reference/src-app.md`** — "Read next" target for app-shell unit tests, `schemas-i18n.spec.ts`, and `i18n.spec.ts`.
- **`docs/reference/src-infrastructure.md`** — "Read next" target for the entire `tests/unit/infrastructure/` block.
- **`docs/reference/src-ui.md`** — "Read next" for `form-idiom.spec.ts`, `formatters.spec.ts`, `use-upload-progress.spec.ts`.
- **`docs/reference/contracts.md`** — "Read next" for `url.spec.ts` and `response-schema-map.spec.ts`.
- **`docs/reference/scripts.md`** — "Read next" for `tests/unit/scripts/` specs.
- **`docs/api/endpoints.md`** — "Read next" for `http.spec.ts` and `errors.spec.ts`.
- **`docs/api/openapi-workflow.md`** — "Read next" for `http-request.spec.ts` and `http-validate-responses.spec.ts`.
- **`docs/theory/modules.md`** — "Read next" for registry, published-language, and kernel-registry specs.
- **`docs/theory/sitemap.md`** — "Read next" for navigation and authentication-guard specs.
- **`docs/theory/strategic-ddd.md`** — §2 and §4 explain the retired `context-map` / `subdomain-discipline` specs whose coupling check was replaced by an ESLint rule (`MODULE_EDGES`).
- **`docs/tools/accessibility-testing.md`** — "Read next" for `a11y-coverage.spec.ts`.
- **`docs/tools/admin-dashboard.md`** — "Read next" for `locale-overrides.spec.ts`.

## Notes

- The two former cross-cutting specs (`context-map.spec.ts`, `subdomain-discipline.spec.ts`) are **gone**. Their typed `dependsOn`/`subdomain` fields were removed; the structural coupling check now runs as a generated ESLint rule on every `npm run lint`.
- The mock backend layer was retired. Cypress e2e tests hit the paired backend's **demo profile** — no local mocks.
- `formatters.property.spec.ts` uses **property-based testing** over generated inputs rather than hand-picked examples; it is the only property-test file called out by name.
- New modules are automatically in scope for all cross-cutting specs on the day they are added (no test update needed for coverage of the rule).
