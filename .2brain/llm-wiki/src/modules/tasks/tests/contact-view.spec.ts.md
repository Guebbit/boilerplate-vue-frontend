---
source: src/modules/tasks/tests/contact-view.spec.ts
sha256: bd1c0305870979b64a4ca04bf77e777d8912a662f29d01484a053501143c513e
signature: 7e87dcf650f7e48485506c8cb492291b49ea607c0418b34f9fa6794c5ddcadb5
generated_at: 2026-11-10T05:57:36.168885+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/contact-view.spec.ts

## Purpose

Vitest spec that mounts the real `Contact.vue` page (with an actual memory-history router, Pinia, i18n, and Vuetify) and verifies its query-param pre-fill logic, unknown-category handling, conditional field omission, support-address rendering, and the post-submit notification. `submitContact` is spied on the tasks store so no real network call is made; the only mocked I/O is the `GET /config` HTTP request.

## Key elements

- **`openContact(address: string)`** — Spies on `useTasksStore().submitContact`, pushes the given address on the memory router, awaits `router.isReady()`, then mounts `Contact` with global plugins and a `HumanCheck` stub. Returns `{ submit, wrapper }` for each test to configure.
- **`fillAndSend(wrapper)`** — Sets values on `[data-test=contact-email]`, `[data-test=contact-subject]`, and `[data-test=contact-message]` in sequence, triggers form submit, and flushes promises.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a function that resolves `parseOrvalFixture(method, url, configAnswer({ supportEmail: 'help@shop.example' }))`, giving the page a deterministic support address.
- **Router (module-level `const`)** — `createMemoryHistory` with `/:locale` → `RouterView` → `collectModuleRoutes(enabledModules)` plus a stubbed `privacy` route. Used as the real routing context so query params are readable.
- **`beforeEach`** — Calls `resetConfig()`, swaps in a fresh Pinia instance, and loads the `'en'` locale before every test.

## Relationships

- **`src/modules/tasks/views/Contact.vue`** — The component under test; imported and mounted directly.
- **`src/modules/tasks/store.ts`** — `useTasksStore().submitContact` is spied and mocked-resolved so assertions can inspect the payload the page would have sent.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register module metadata that `collectModuleRoutes` and the router need.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` parses the raw fixture into the shape the HTTP client would return.
- **`tests/support/unit/config-answer.ts`** — `configAnswer` builds the typed config payload (here: `{ supportEmail }`) passed to `parseOrvalFixture`.

## Notes

- The `HumanCheck` component is stubbed (`<div />`) to avoid its own `GET /config` call; its internal logic is covered separately in `tests/unit/ui/human-check.spec.ts`.
- The privacy route is a null-render stub because the app-tier assembly is out of scope for this spec; the test only asserts that a link *exists* in the privacy line.
- `resetConfig()` in `beforeEach` is essential: the mocked HTTP layer resolves config data, and without the reset a previous test's config could leak into the next.
- The router is created once at module scope and shared across all tests; `router.push` is the mechanism for varying the initial query string per test rather than re-creating the router.
