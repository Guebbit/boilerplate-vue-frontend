---
source: src/modules/products/tests/use-translated-entity-form.spec.ts
sha256: 32e6a9002f23f7b1644d2f2bc96f64999f9c2fadeb6f1bc77064db8caaebc8f0
signature: 7c5871bccda5d57b6131bc3b68ed158536918ef189e02ab90c70330d5973cc06
generated_at: 2026-11-10T05:33:09.932528+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/use-translated-entity-form.spec.ts

## Purpose

Vitest spec for the `useTranslatedEntityForm` composable. It exercises two behavioral areas: language-tab lifecycle (seeding the fallback tab, adding blank tabs, removing tabs, and restoring stored translations) and the post-submit failure path (how a 412 / stale response is routed versus a generic error that blocks the form).

## Key elements

- **`setup(options)`** – Mounts a throwaway Vue component (via `@vue/test-utils`) whose `setup()` runs `useTranslatedEntityForm<TranslatedForm>` with the caller-supplied options. Returns `{ result, fallbackLocale }` so each test can inspect and mutate reactive state directly.
- **`getterOf(value)`** – Small helper that converts a plain value (or `undefined`) into the constant-getter shape the composable's `stored` option expects.
- **`Harness`** – Type alias for `ReturnType<typeof useTranslatedEntityForm<TranslatedForm>>`, used as the static type of the composable instance inside each test.
- **`renderNothing`** – Minimal render function (`h('div')`) so the harness component satisfies Vue's requirement of returning a render function without asserting anything about the DOM.
- **`describe('…tabs')`** – Five tests covering: seeding the fallback locale on first assignment, *not* seeding when `seedFallback` is falsy, `handleAddLocale` creating a blank translation and activating it, `handleRemoveLocale` deleting an unsaved tab and falling back to the fallback tab, and `handleRemoveLocale` nulling a *stored* tab so `handleAddLocale` can restore its original content.
- **`describe('…a failed submit')`** – Two tests: a 412 handled by `onStale → true` suppresses `reportSubmitError`; a generic error with `onStale → false` is forwarded to `reportSubmitError`.

## Relationships

- **`src/modules/products/composables/use-translated-entity-form.ts`** – The system under test. The spec imports `useTranslatedEntityForm` and the `TranslatedForm` type from this file and drives every assertion against its returned refs (`openTags`, `activeTab`, `form`) and methods (`handleAddLocale`, `handleRemoveLocale`, `handleSubmitFailure`).

## Notes

- Tests are **state-level, not DOM-level**: the harness renders an empty `<div>` and all assertions target the composable's returned refs. There is no `wrapper.find` / `wrapper.text` usage.
- The "stored" removal test asserts that removing a tab the server originally had sets `translations[locale]` to **`null`** (not `delete`), which is what allows the subsequent `handleAddLocale` to restore the saved values. A naïve `delete` implementation would fail this test.
- `onStale` returning `true` is the composable's signal that the caller has already handled the error (e.g., showed a "data is stale" dialog); in that case `reportSubmitError` must **not** fire. The test asserts this via `expect(report).not.toHaveBeenCalled()`.
- The spec imports the composable with an explicit `.ts` extension (`'../composables/use-translated-entity-form.ts'`), consistent with a project-wide ESM / Vite convention.
