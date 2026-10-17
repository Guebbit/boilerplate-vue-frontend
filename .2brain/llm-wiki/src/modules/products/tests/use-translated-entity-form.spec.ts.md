---
source: src/modules/products/tests/use-translated-entity-form.spec.ts
sha256: 32e6a9002f23f7b1644d2f2bc96f64999f9c2fadeb6f1bc77064db8caaebc8f0
generated_at: 2026-10-17T01:35:10.478423+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/use-translated-entity-form.spec.ts

## Purpose

Vitest spec for the `useTranslatedEntityForm` composable. Verifies the language-tab lifecycle (seed, add, remove, restore) and the error-handling contract for failed form submits, using a minimal mounted harness component.

## Key elements

- **`setup(options)`** – Mounts a throwaway component whose `setup()` calls `useTranslatedEntityForm<TranslatedForm>` with caller-supplied options (`fallback`, `seedFallback`, `stored`, `onStale`, `reportSubmitError`). Returns the composable's return object and the `fallbackLocale` ref. All other args are pinned to bare-minimum defaults.
- **`getterOf(value)`** – Converts a plain value (or `undefined`) into the constant-getter shape the composable's `stored` parameter expects.
- **`renderNothing`** – Trivial render function (`h('div')`) so `mount` succeeds without a real template.
- **`Harness` type alias** – `ReturnType<typeof useTranslatedEntityForm<TranslatedForm>>`, used to type the captured composable return.
- **`describe("… — tabs")`** – Five tests covering: seeding the fallback tab only when `seedFallback` is true, opening a new locale tab, removing a non-stored tab (key deleted), and removing a *stored* tab (key set to `null` so re-adding restores the server content).
- **`describe("… — a failed submit")`** – Two tests: a 412-style error handled by `onStale` (returns `true`) suppresses `reportSubmitError`; an unhandled error is passed through to `reportSubmitError` unchanged.

## Relationships

- **`src/modules/products/composables/use-translated-entity-form.ts`** – The system under test. The spec imports `useTranslatedEntityForm` and the `TranslatedForm` type from this file.
- **`@/i18n`** – Provides `i18n` (installed as a plugin on the harness) and `loadLocale('en')` (called in `beforeEach` so every test starts with the `en` locale loaded).
- **`@vue/test-utils` / `vue`** – `mount`, `defineComponent`, `h`, `ref`, `nextTick` power the harness.
- **`zod`** – Supplies the `schema` argument (`z.custom<TranslatedForm>()`) the composable requires.
- **`pinia`** – `createPinia()` is installed on the harness because the composable uses Pinia internally.

## Notes

- `stored` must be a **getter function**, not a plain object. `getterOf` exists solely to bridge that gap in tests; passing a bare object directly would not match the composable's expected signature.
- Removing a *stored* tab sets `translations[locale]` to `null` (the key remains); removing a non-stored tab **deletes** the key. The spec asserts this asymmetry explicitly.
- `beforeEach(() => loadLocale('en'))` ensures a clean locale state; without it, a previous test's locale could leak in.
- The `onStale` callback is the composable's escape hatch: returning `true` signals the caller handled the error and `reportSubmitError` must *not* fire.
