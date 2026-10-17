---
source: src/modules/example/tests/schemas-i18n.spec.ts
sha256: 4423a2ff63279794175612662b805cce71d22616ea59e799c3fa72fe224ee78a
generated_at: 2026-10-17T00:53:49.368971+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/schemas-i18n.spec.ts

## Purpose

Verifies that the example module's Zod schema and its locale dictionaries actually agree: when the active i18n locale switches between English and Italian, the same schema object emits the corresponding locale-specific error string for an empty `title`. It lives alongside the domain code because it pins a module-internal contract (schema ↔ JSON), distinct from the cross-cutting mechanism test that proves the thunk-at-parse-time trick works in general.

## Key elements

- **`setLocale(locale)`** – Calls `loadLocale` and then `nextTick()`, returning a promise that resolves once the locale switch has propagated through Vue reactivity.
- **`messagesForEmptyTitle()`** – Runs `exampleCreateSchema.safeParse({ title: '', body: 'A body' })` and returns the array of issue messages (or `[]` if no error).
- **`describe('example schema messages')` / single `it`** – Asserts that after switching to `'en'` the English message from `enMessages['example-form']['title-required']` is present, then switches to `'it'` and asserts the Italian equivalent from `itMessages['example-form']['title-required']` is present, using the same schema instance.

## Relationships

- **`src/modules/example/schemas.ts`** — Supplies `exampleCreateSchema`, the Zod schema whose error messages are the subject of the assertions.
- **`tests/support/unit/wire-modules.ts`** — Supplies `wireModulesIntoCore()`, which registers the i18n module with the real vue-i18n instance exactly as `src/main.ts` does, so the test exercises genuine message resolution rather than a stubbed lookup.

## Notes

- The file deliberately avoids mocking `t`; a mock would only prove a key was *looked up*, which stays true even if the frozen string is in the wrong language. The real vue-i18n instance (wired via `wireModulesIntoCore`) is required for the assertion to be meaningful.
- The JSDoc header explicitly scopes this test: the *mechanism* (thunked Zod messages re-resolving at parse time) is covered once in `tests/cross-cutting/schemas-i18n.spec.ts`. This file's sole job is the module-internal schema-to-dictionary agreement.
- `afterEach` resets the locale to `'en'` to prevent cross-test contamination.
