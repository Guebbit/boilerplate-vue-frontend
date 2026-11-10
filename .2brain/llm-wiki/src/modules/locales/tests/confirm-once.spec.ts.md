---
source: src/modules/locales/tests/confirm-once.spec.ts
sha256: 3258cee79ba440948f4c2b11430481ff7710774277af13921e4ac64dd3119caf
signature: 02db559f7f09a6f15fcf50e06816855a6c530da86a47918b6c13a27b32d1fd2e
generated_at: 2026-11-10T04:42:05.751373+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/confirm-once.spec.ts

## Purpose

Verifies that the locale-admin delete buttons (language list and entry list) are idempotent under a rapid double-click: a second press arriving before the first confirmation resolves must neither re-open the dialog nor fire a second delete request. The file exists to guard against accidental double-deletion in the two Vuetify views.

## Key elements

- **`describe('a double press on a locale delete')`** — top-level suite; contains two tests that each mount a view, double-click the delete button via `Promise.all([trigger('click'), trigger('click')])`, then assert `confirm` and the actual delete call each happened exactly once.
- **`deletes a language once`** — mounts `LocalesList`, spies on `store.removeLanguage` and `useDialogStore().confirm`, clicks `[data-test=row-delete]` twice, expects one confirmation and one removal.
- **`deletes an entry once`** — pushes the router to `/en/locales/es`, mounts `LocaleEntries`, clicks `[data-test=entry-delete]` twice, then filters `orvalMutator` calls for `DELETE` to assert only one wire request.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a function that looks up the `responses` record by `"METHOD /url"` and wraps the result in `parseOrvalFixture`.
- **`responses`** — maps the two expected endpoints (`GET /locales/es/entries`, `DELETE …/entries/locale-entry-1`) to their fixture payloads.
- **`SPANISH`** — a single `Language` object injected into the store's state so the views render a deletable row.
- **`router`** — a real Vue Router with `createMemoryHistory` and `collectModuleRoutes(enabledModules)` so in-view links resolve.
- **`wireModulesIntoCore()`** — called once at module top-level (not in `beforeEach`) to register module wiring before any test runs.

## Relationships

- **`src/modules/locales/store.ts`** — `useLocalesStore` is imported and spied on (`fetchLanguages`, `fetchApps`, `removeLanguage`); its reactive state is set directly to drive view rendering.
- **`src/modules/locales/views/LocalesList.vue`** — mounted in the language-delete test; the `[data-test=row-delete]` button is the click target.
- **`src/modules/locales/views/LocaleEntries.vue`** — mounted in the entry-delete test; the `[data-test=entry-delete]` button is the click target.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` is called inside the `orvalMutator` mock to shape/validate the resolved payload per method+URL.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore` is invoked at import time to wire module registries so `collectModuleRoutes` and the stores work in the test environment.

## Notes

- The "double press" is simulated by firing two `click` events inside a single `Promise.all`, i.e. both arrive before any microtask can resolve the first confirmation. This is an intentional race-window test, not a sequential double-click.
- `wireModulesIntoCore()` runs at module scope, *before* `beforeEach` resets Pinia. If module wiring ever becomes stateful across tests, this ordering will matter.
- The entry-delete test inspects the raw `orvalMutator` call log (filtered to `DELETE`) rather than spying on a store method, because the entry removal path goes straight through the HTTP layer without a dedicated store action.
