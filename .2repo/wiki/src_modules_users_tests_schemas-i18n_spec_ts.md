# src/modules/users/tests/schemas-i18n.spec.ts

## Purpose
Vitest spec that verifies the users module's Zod schemas resolve validation error messages through the real vue-i18n instance into both English and Italian. It asserts a domain-specific invariant: every i18n key the schemas reference exists in both locale dictionaries, and the Italian strings are genuinely different from the English ones.

## Key elements
- **`setLocale(locale)`** — calls `loadLocale` then `nextTick()` so Vue reactivity settles before the next assertion.
- **`messagesOf(schema, value)`** — runs `schema.safeParse(value)` and returns the array of `issue.message` strings (empty array when no error).
- **`describe('users schema messages')`** — two tests:
  - *English → Italian on the same schema object*: parses an invalid `{ email, username }` through `usersSchema`, asserts the English message appears, switches to Italian, re-parses, and asserts the Italian message appears.
  - *Password refinements in Italian*: parses `'short'` through `usersPasswordSchema` and asserts all four refinement messages (`password-min`, `password-maius-required`, `password-number-required`, `password-special-required`) match the Italian dictionary.

## Relationships
- **`tests/support/unit/wire-modules.ts`** — calls `wireModulesIntoCore()` in `beforeAll` to register the users module's locale dictionaries on the shared i18n instance, replicating what `src/main.ts` does at application startup. Without this call the `loadLocale` + `t` chain would have no module-level messages registered.

## Notes
- Deliberately uses the **real** vue-i18n instance, not a mocked `t`. A mock would only prove a key was *looked up*, not that the resolved string is in the correct language.
- This spec is intentionally colocated with the users module (per `docs/theory/modules.md`): deleting the module folder removes the coverage rather than orphaning a cross-cutting test. The *mechanism* (thunked Zod messages re-resolving at parse time) is covered once in `tests/cross-cutting/schemas-i18n.spec.ts`.
- `messagesOf` is a local helper typed against a minimal structural interface (`safeParse` returning `{ error?: { issues: … } }`) rather than importing the full Zod type, keeping the spec independent of Zod's version-specific typings.
- `afterEach` resets the locale back to `'en'` to prevent cross-test leakage.
