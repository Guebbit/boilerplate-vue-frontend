# docs/tools/unit-testing.md

## Purpose

Documents the project's unit-testing layer: the tooling, mount/mocking patterns, file layout, and the cross-cutting architectural-invariant specs that run under the same Vitest suite. Exists so a contributor (human or AI) can locate the right spec, understand the one `msw/node` exception, and know which support files a new test needs—without reading the full doc or the specs themselves.

## Key elements

- **Vitest** — test runner; reuses the app's Vite transforms (no separate build).
- **`@vue/test-utils` + Vuetify plugin** — components must be mounted with `global: { plugins: [vuetify] }` or Vuetify children won't resolve.
- **`createPinia()` per test** — fresh store instance in `beforeEach`; no state leaks.
- **`vi.mock('@api', …)`** — standard way to stub the generated API client at the module boundary for store tests.
- **`msw/node` (one exception)** — `http-refresh.spec.ts` spins up a real HTTP server because the 401→refresh→replay flow lives inside axios interceptors and cannot be exercised by a module stub.
- **`orvalMutator` / response-validation specs** — unit-test the OpenAPI-derived Zod contract check that both e2e profiles rely on.
- **Cross-cutting layer (`tests/cross-cutting/`)** — eight architectural-invariant specs (registry, published-language, a11y-coverage, store-location, form-idiom, schemas-i18n, etc.) that fail on *missing* files, unlike behavioural specs.
- **Support files** — `tests/support/unit/setup.ts` (global setup), `tests/support/unit/wire-modules.ts` (module schema/dict registration), `tests/support/unit/jsdom-quiet-css.environment.ts` (jsdom with CSS-parser noise filtered), `tests/support/stub.ts` (`asStub` helper).
- **`vitest.config.ts` / `vitest.config.mutation.ts`** — runner config and the narrower Stryker variant.

## Relationships

- **`package.json`** — defines the `test:unit`, `test:unit:coverage`, and mutation-testing scripts this layer is invoked through.
- **`docs/tools/component-testing.md`** — sibling tool doc; the unit layer covers component mount tests, while the component-testing doc (if it describes a distinct layer) sits above or beside it in the testing pyramid.
- **`docs/tools/live-e2e.md`** — the next layer up; the unit layer is explicitly "the only layer that stubs the network," while live-e2e talks to a real backend.
- **`docs/tools/visual-regression.md`** — sibling tool in the same `docs/tools/` group; complementary rather than dependent.
- **`tests/unit/infrastructure/http/http-refresh.spec.ts`** — the single spec this doc calls out by name as the msw/node exception; understanding its rationale (interceptor chain can't be stubbed) is central to the "one exception" pattern.

## Notes

- Two former cross-cutting specs (`context-map.spec.ts`, `subdomain-discipline.spec.ts`) were removed; their checks moved to a generated ESLint rule (`MODULE_EDGES` in `eslint.config.ts`) and are now enforced on every `npm run lint`.
- `tests/cross-cutting/` is described as "a layer, not a folder"—it runs in the same Vitest suite but answers a different question (repo shape vs. behaviour).
- The jsdom environment is a thin custom wrapper (`jsdom-quiet-css.environment.ts`), not the string `'jsdom'`; use the wrapper path in `vitest.config.ts` to get the CSS-noise filter.
- `tests/support/unit/wire-modules.ts` must be imported by any spec that touches module response schemas or dictionaries; without it those subsystems are unregistered.
- The `asStub` helper in `tests/support/stub.ts` preserves the full type of a `vi.fn()` when reading it back—prefer it over raw casts.
