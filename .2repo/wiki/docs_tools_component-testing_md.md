# docs/tools/component-testing.md

## Purpose

Documents the strategy, conventions, and worked examples for testing individual `.vue` components with `@vue/test-utils`. It establishes *what* to assert (resource cleanup, boundary values, emit contracts) over *how* markup looks, so that new specs target the questions only the component layer can answer.

## Key elements

- **Testing priority order** — resources/subscriptions → boundary logic → validation surfacing → incidental paths.
- **`FormImageUpload` example** — object-URL lifecycle (replace / clear / unmount), idle-vs-zero distinction, model shape, preview precedence.
- **`ListPagination` example** — the `length > 1` comparison tested at 0, 1, and 2 pages; visible-page cap.
- **`data-testid` selection rule** — never assert on Vuetify's own rendered classes; `data-testid` is the only stable selector contract.
- **i18n assertion guidance** — prefer accessible attributes (`aria-valuenow`) over rendered text, because unit tests load locale dictionaries lazily.
- **Mutation-testing gate** — `.vue` files are excluded from Stryker's `mutate` scope until component specs exist; template expressions are not mutatable anyway.
- **Commands** — `npm run test:unit` (full unit suite) or `npx vitest run tests/unit/ui/` (component specs only).

## Relationships

- **`docs/tools/unit-testing.md`** — the broader suite these component specs run inside; this page is a subset/convention layer.
- **`docs/tools/accessibility-testing.md`** — complementary layer that validates the *rendered* output is usable; component tests assert structure/behaviour, accessibility tests assert the result is perceivable.
- **`docs/tools/mutation-testing.md`** — component specs are the prerequisite for adding `.vue` files to Stryker's `mutate` scope.
- **`tests/support/unit/setup.ts`** — provides the jsdom polyfills (`ResizeObserver`, `matchMedia`, pointer capture, `visualViewport`) that Vuetify components require at mount time.
- **`tests/unit/ui/form-image-upload.spec.ts`** — the primary worked example referenced throughout this page (URL lifecycle, boundary values, model shape).
- **`tests/unit/ui/list-pagination.spec.ts`** — the second worked example (render boundary at 0/1/2 pages, visible-page cap).

## Notes

- `data-testid` is **load-bearing**, not stylistic: Vuetify's `v-file-input` renders its own `.v-progress-linear` inside the field loader, so a class-based selector matches the wrong element and passes in both directions.
- The three leak moments for object URLs (replace, clear, unmount) are only observable by counting a stubbed `revokeObjectURL` call — no visual or e2e signal exists.
- `ListPagination`'s entire logic is one comparison (`length > 1`); testing it as three discrete cases (0, 1, 2) lets a failure identify *which side* of the comparison moved.
- Asserting on visible text in component tests is fragile under i18n because locale dictionaries load lazily in the unit environment; the raw key is what renders.
- Stryker can mutate the `<script>` block of an SFC but **not** template expressions — including `.vue` files without specs would inflate an unearned coverage number.
