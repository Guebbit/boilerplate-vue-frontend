---
source: src/modules/example/tests/example-status-actions.spec.ts
sha256: 6ccc9dabae026c4c151aec4739d6afa0c48b2d29a8dd8994999c75246d268c3f
signature: ffbd4920e8b5c476b39f8a0fbeceacda6ba6fcca2b5091800784c5579fea7e52
generated_at: 2026-11-10T04:25:56.936816+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/example-status-actions.spec.ts

## Purpose

Unit-test spec for the `ExampleStatusActions` component. It verifies two contracts: (1) the component renders a button **only** for each event the server flags open in `actions` (it makes no independent decisions), and (2) clicking a button delegates to the injected provider's `changeStatus` rather than calling the store directly.

## Key elements

- **`mountUnder(open, changeStatus?)`** – Mounts `ExampleStatusActions` inside a throwaway provider that calls `provideExample` with a draft example whose `actions` booleans mirror the `open` array. Accepts `undefined` for `open` to simulate the still-loading state.
- **`offered(wrapper)`** – Collects the `data-test` attribute (e.g. `example-move-publish`) from every rendered move button.
- **`describe('ExampleStatusActions')`** – The test suite:
  - *Parameterised render test*: feeds `[publish, archive]`, `[archive]`, `[unarchive]`, `[]` and asserts the exact set of buttons produced.
  - *Loading test*: `open = undefined` → no buttons.
  - *Delegation test*: clicks the publish button and asserts `changeStatus` was called with `'publish'`.

## Relationships

- **`src/modules/example/components/ExampleStatusActions.vue`** – The component under test; rendered by the provider wrapper via `h(ExampleStatusActions)`.
- **`src/modules/example/provided.ts`** – Supplies `provideExample`, which seeds the injectable context the component reads.
- **`src/modules/example/store.ts`** – Source of the `ExampleEvent` type used to type the `open` array and the `changeStatus` callback.
- **`tests/support/unit/wire-modules.ts`** – Called once at module top (`wireModulesIntoCore()`) to register example-module bindings in the shared test core before any mounts occur.

## Notes

- The mock example hard-codes `actions.update` and `actions.delete` to `true`, but the tested component only surfaces `publish`, `archive`, and `unarchive` buttons; the other two flags are noise for this spec.
- Button identity is discovered via the `data-test^="example-move-"` attribute prefix — if that prefix changes, the `offered` helper and the delegation-test selector break simultaneously.
- The spec is intentionally synchronous in its assertions *after* the async `loadLocale`/`mount` chain resolves; there are no timers or fake-clock usage.
