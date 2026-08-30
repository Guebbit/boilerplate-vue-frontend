# tests/cross-cutting/schemas-i18n.spec.ts

## Purpose

Cross-cutting integration test for the i18n × Zod mechanism: it proves that a schema whose error messages are thunks (`() => translate(…)`) resolves in the active locale at parse time, and that `revalidateOn` in `useStructureFormValidation` re-translates errors already rendered on screen after a locale switch. It uses a synthetic, domain-agnostic schema so it survives the deletion of any single module.

## Key elements

- **`madeUpSchema`** — a one-field Zod schema (`z.email`) whose `error` is a thunk calling `translate('madeUpForm.emailInvalid')`; the exact shape every domain schema follows.
- **`registerLocaleContributors(…)`** — call-site registration of synthetic EN/IT dictionaries; replaces `wireModulesIntoCore()` to keep the test free of real domain vocabulary.
- **`messagesOf(schema, value)`** — thin helper that runs `safeParse` and returns the array of issue messages.
- **`setLocale(locale)`** — calls `loadLocale` and waits one `nextTick()` so Vue reactivity settles.
- **`createHarness(options?)`** — a minimal `defineComponent` wrapping `useStructureFormValidation` with `madeUpSchema`; renders `formErrors.email` in a `<p class="error">` element. Used with `mount` and the real `i18n` plugin.
- **`describe('a thunked schema follows the active locale')`** — single test: parses once in EN, switches to IT, parses the *same* schema object, asserts the Italian message.
- **`describe('displayed errors and a locale switch')`** — three tests: (1) `revalidateOn: i18n.global.locale` causes a re-render with the new-locale string; (2) an unvalidated form stays blank; (3) *without* `revalidateOn` the error goes stale (still English under Italian UI) — the negative case that justifies the option's existence.

## Relationships

No files are tracked as graph neighbors. The test imports `i18n`, `loadLocale`, `registerLocaleContributors`, and `translate` from `@/infrastructure/i18n`, and `useStructureFormValidation` from `@guebbit/vue-toolkit`. It is self-contained: no other spec file depends on it, and it intentionally does not import any domain schema.

## Notes

- **Real i18n, no `vi.mock`.** A mocked `t` would only prove a key was looked up, not that the resolved string is in the correct language. The file uses the actual vue-i18n instance throughout.
- **Deliberately synthetic.** Importing `usersSchema`, `productsSchema`, etc. would couple this cross-cutting test to every domain's lifetime. Each module is expected to ship its own `src/modules/<name>/tests/schemas-i18n.spec.ts` covering its real messages.
- **The staleness test is a pin, not a regression guard.** The comment states: if a future change makes the "goes stale without revalidateOn" test pass, the `revalidateOn` option has become redundant and *the option* should be removed — the test is the deletion trigger.
- **Locale is reset to `'en'` in `afterEach`** to prevent cross-test leakage within the file.
