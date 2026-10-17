---
source: tests/cross-cutting/schemas-i18n.spec.ts
sha256: 083608e82f968cca0d5edaf670715a579d06d6e241e79907a0e7c11cffb9b71a
generated_at: 2026-10-17T02:02:33.107618+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/schemas-i18n.spec.ts

## Purpose

Verifies the cross-cutting contract that Zod schemas with thunked error messages (`{ error: () => translate('…') }`) resolve in the active locale at parse time, and that `useStructureFormValidation`'s `revalidateOn` option re-translates errors already rendered on screen after a locale switch. Uses a deliberately invented schema and synthetic locale dictionary so the spec survives deletion of any real domain module.

## Key elements

- **`madeUpSchema`** – A single-field Zod object (`z.email`) whose error is a thunk calling `translate('madeUpForm.emailInvalid')`. Stands in for every domain schema's shape.
- **`registerLocaleContributors`** – Registers synthetic EN/IT dictionaries under the `madeUpForm` namespace, replacing `wireModulesIntoCore()` to avoid pulling in real domain vocabulary.
- **`setLocale(locale)`** – Loads the locale via `loadLocale` then awaits `nextTick`, giving Vue a render tick before assertions.
- **`messagesOf(schema, value)`** – Runs `safeParse` and extracts the `message` strings from any issues; returns `[]` on success.
- **`createHarness(options)`** – A minimal Vue component that wires `useStructureFormValidation` to `madeUpSchema` and renders `formErrors.email` into a `<p class="error">`. Used to mount against the real `i18n` plugin without a full view.
- **`describe('a thunked schema follows the active locale')`** – Single test: parses the same schema object in EN, switches to IT, parses again, asserts the correct string each time.
- **`describe('displayed errors and a locale switch')`** – Three tests covering `revalidateOn` behavior: re-translation on switch, no-op for unvalidated forms, and the intentional staleness without `revalidateOn`.

## Relationships

No graph neighbors are registered. The file imports from `@/i18n` (real `i18n` instance, `loadLocale`, `registerLocaleContributors`, `translate`) and `@guebbit/vue-toolkit` (`useStructureFormValidation`), but these are consumed at runtime inside the test rather than as structural dependencies tracked in the graph.

## Notes

- The schema is **invented on purpose**: importing real domain schemas (`usersSchema`, `productsSchema`, etc.) would create cross-module coupling described in `docs/theory/modules.md`. Each real module proves its own messages in `src/modules/<name>/tests/schemas-i18n.spec.ts`.
- The last test in the second `describe` block (`'goes stale without revalidateOn…'`) is a **regression pin**: it asserts the bug that `revalidateOn` exists to fix. If a future change makes that test pass, the option is redundant and the option itself should be removed—not the test.
- No `vi.mock` is used for i18n. A mocked `t` would only prove a key was looked up, not that the resolved string matches the active language.
- The thunk pattern is the load-bearing invariant: `() => translate('…')` (evaluated at parse time) vs. `translate('…')` (evaluated once at schema-creation time). The first `describe` block is the direct test of that distinction.
