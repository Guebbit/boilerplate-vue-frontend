# src/modules/users/tests/schemas-i18n.spec.ts

## Purpose

Verifies that the users module's Zod schemas (`usersSchema`, `usersPasswordSchema`) emit validation messages resolved through the **real** vue-i18n instance in the currently active locale. This is distinct from the cross-cutting spec (`tests/cross-cutting/schemas-i18n.spec.ts`) which proves the thunked-message mechanism in isolation; this file proves the domain schemas and the `en.json` / `it.json` dictionaries actually agree. It lives alongside the domain rather than in a shared test folder.

## Key elements

- **`setLocale(locale)`** – calls `loadLocale(locale)` then awaits `nextTick()` so DOM-facing reactivity settles before the next assertion.
- **`messagesOf(schema, value)`** – helper that runs `schema.safeParse(value)` and returns the flat array of issue `message` strings (empty array on success).
- **`beforeAll`** – calls `wireModulesIntoCore()` to register locale messages the same way `src/main.ts` does, then sets the initial locale to `en`.
- **`afterEach`** – resets the locale back to `en` so tests don't leak state.
- **`it('resolves in English, then in Italian…')`** – parses an invalid `{ email, username }` against `usersSchema` in `en`, asserts the Italian message appears after switching to `it`.
- **`it('does the same for every password rule…')`** – parses the string `'short'` against `usersPasswordSchema` in `it` and asserts all four refinement messages (`password-min`, `password-maius-required`, `password-number-required`, `password-special-required`) are present.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – provides `wireModulesIntoCore()`, called once in `beforeAll`. This wires the users module's locale dictionaries into the shared vue-i18n core so that `loadLocale` / `t` can resolve `users-form.*` keys exactly as the production app does. Without this call the schemas' thunked messages would have no dictionary to read from.

## Notes

- The file deliberately avoids mocking `t`; a mock would only confirm a key *was looked up*, not that the returned string matches the dictionary in the target language.
- `messagesOf` accepts a structural type rather than the concrete Zod schema type, keeping the helper independent of a specific Zod version.
- Locale switching is sequential within a single test (English → Italian) rather than split into separate tests, because the point is that the *same schema object* re-resolves its messages.
