---
source: src/modules/example/tests/use-example-transition.spec.ts
sha256: 8dd8109a75e06f3e6a55379997734d26d1f02ec8cf6a9ca6f6fe2cb95925b00e
signature: 4f5cd9662286864972a861b51887066eb25132a826fcdcc375c63964a98be7aa
generated_at: 2026-11-10T04:27:54.509932+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/use-example-transition.spec.ts

## Purpose

Unit tests for the `useExampleTransition` composable. Verifies the three status-transition outcomes: a successful publish, a 409 conflict (which must re-read the record past the cache), and any other refusal (which must not re-read).

## Key elements

- **`Host`** – Minimal `defineComponent` whose `setup` calls `useExampleTransition(routedId)` and stores the result in the module-level `hosted` ref. Renders an empty `<div>`.
- **`mountHost()`** – Mounts `Host` with the `i18n` plugin via `@vue/test-utils` and returns the captured composable return value.
- **`hosted`** – Module-scoped mutable bag used to escape the composable result out of the component setup so tests can assert on it.
- **`routedId`** – Stub returning the fixed id `'ex-1'` that the composable would normally get from the route.
- **`MOVED`** – A concrete `Example` fixture (`status: 'published'`) representing the post-transition record.
- **Three `it` blocks** – Each spies on `store.transitionExample` (and `store.fetchExample` for the error cases), calls `changeStatus('publish')`, then asserts call-args and the `error` ref.

## Relationships

- **`src/modules/example/composables/use-example-transition.ts`** – System under test; imported and invoked as `useExampleTransition(routedId)`.
- **`src/modules/example/store.ts`** – `useExampleStore` is the Pinia store whose `transitionExample` and `fetchExample` methods are spied/mocked to simulate server outcomes.
- **`tests/support/unit/fixtures.ts`** – Provides the `aProblem(status, errors)` factory used to build the 409 and 500 problem responses.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module top-level to register the example module with the application core before any test runs.

## Notes

- The composable is exercised through a real Vue component mount (not a bare setup-function call), so reactivity and `v-if`-style gating inside the composable are exercised for free.
- The 409 test asserts `fetchExample` is called exactly once with `{ forced: true }`, encoding the "bypass the cache on conflict" contract. The 500 test asserts it is **not** called at all.
- `wireModulesIntoCore()` runs at import time, not in `beforeEach`; if another spec file in the same worker imports this module it is a no-op, but the order of imports across files is therefore load-bearing.
