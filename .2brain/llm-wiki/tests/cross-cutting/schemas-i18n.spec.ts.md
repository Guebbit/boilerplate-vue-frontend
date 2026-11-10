---
source: tests/cross-cutting/schemas-i18n.spec.ts
sha256: 083608e82f968cca0d5edaf670715a579d06d6e241e79907a0e7c11cffb9b71a
signature: 1e0d332c74679862dceadb07272965e18b74e0f0a7a7aace08b075a562b7e0bb
generated_at: 2026-11-10T06:41:12.461215+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/schemas-i18n.spec.ts

## Purpose

Cross-cutting spec that proves two i18n guarantees independently of any domain module: (1) a Zod schema whose error messages are **thunks** (`() => translate(…)`) resolves in whichever locale is active at parse time, with no schema rebuild; and (2) the `revalidateOn` option of `useStructureFormValidation` re-translates error strings already rendered on screen when the locale changes. Both are tested against the real `@/i18n` instance with a synthetic schema so the file survives deletion of any domain module.

## Key elements

- **`madeUpSchema`** – A one-field Zod schema (`z.email`) whose sole error is a thunk calling `translate('madeUpForm.emailInvalid')`. Serves as the domain-agnostic fixture for both `describe` blocks.
- **`registerLocaleContributors({ en, it })`** – Registers a single synthetic contributor providing the `madeUpForm.emailInvalid` key in English and Italian. Bypasses `wireModulesIntoCore()` to avoid coupling to real module vocabularies.
- **`setLocale(locale)`** – Wraps `loadLocale(locale)` + `nextTick()` for a deterministic locale switch between assertions.
- **`messagesOf(schema, value)`** – Thin helper that runs `schema.safeParse(value)` and extracts the array of issue messages.
- **`createHarness(options)`** – A minimal Vue component that calls `useStructureFormValidation` with `madeUpSchema` and renders `formErrors.email` into a `<p class="error">`. Used to mount a real composable + real i18n plugin without a full view.
- **`describe('a thunked schema follows the active locale', …)`** – Asserts the same schema object returns `EN` then `IT` after a locale switch.
- **`describe('displayed errors and a locale switch', …)`** – Three cases: `revalidateOn` re-translates a rendered error; an unvalidated form stays empty; and (pinning the bug) without `revalidateOn` the rendered text stays in the original language.

## Relationships

No graph neighbors are registered for this file. Its direct imports are:

- `@guebbit/vue-toolkit` → `useStructureFormValidation` (the composable under test)
- `@/i18n` → `i18n`, `loadLocale`, `registerLocaleContributors`, `translate` (the real i18n runtime)
- `zod`, `vue`, `@vue/test-utils`, `vitest` (frameworks)

By design it does **not** import any domain schema (`usersSchema`, `productsSchema`, etc.).

## Notes

- **Thunks, not eager calls.** The central invariant is `error: () => translate(…)` vs. `error: translate(…)`. Zod v4 invokes the thunk at parse time, so the message is always fresh. A spec written against the eager form would pass trivially and miss the bug.
- **No `vi.mock`.** Mocking `t` would only verify a key lookup, not that the resolved string matches the active locale. The real `i18n` plugin is mounted.
- **Invented schema is intentional.** Importing real domain schemas would create a cross-domain dependency: deleting `src/modules/users` would break this file. The mechanism is domain-agnostic, so the fixture is too. Per-module i18n coverage lives in each module's own `tests/` directory, where deleting the folder deletes the coverage.
- **The "goes stale" test is a regression pin, not a desired behavior.** If a future change makes it pass (i.e., errors re-translate without `revalidateOn`), the option becomes redundant and *the option* should be removed, not the test.
- **`afterEach` resets to `en`.** Prevents locale bleed between tests; the synthetic contributor only covers two locales.
