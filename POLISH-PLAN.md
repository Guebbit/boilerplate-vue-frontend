# Polish plan — what is left

Audit date **2026-09-07**. Phases 1–4 and 6–9 landed the same day, across ten commits. What
remains is **one uncommitted change** waiting on a review, and nothing else.

---

## Where the gates stand

| Check                                       | Result                                 |
| ------------------------------------------- | -------------------------------------- |
| `npm run lint` (`--max-warnings 0`)         | **clean**                              |
| `npm run prettier:check`                    | **clean**, whole tree                  |
| `npm run type-check-only`                   | **clean**                              |
| `npm run build`                             | **clean**                              |
| `npm run docs:build`                        | **clean**                              |
| Unit suite                                  | **1630/1630**                          |
| `npm run test:e2e`                          | **32 specs, 4/4 shards**               |
| Control-flow nesting > 3 levels             | **none**, repo-wide                    |
| `any` anywhere                              | **none**                               |
| `@ts-ignore` / `@ts-expect-error`           | **none**, repo-wide                    |
| `try`/`catch` in `src/`                     | 3, each justified in place — no action |
| `async`/`await` in `src/`                   | **none** (promise chaining throughout) |
| Native `confirm()` in `src/`                | **none**                               |
| History narration in comments               | **none**                               |
| Undocumented top-level declarations         | **none** in `src/`                     |
| `.ts`/`.vue` under `src/` without `@module` | **none**                               |

---

## The one thing left: §2.4, and whether it is worth it

**Status: written, verified, DELIBERATELY UNCOMMITTED.** It is a DRY change that could fairly be
called overabstraction, so it is a judgement call rather than a defect fix.

`src/ui/composables/use-list-page-controls.ts` (new, untracked) exports:

- `PAGE_SIZE_OPTIONS` — the `[{10},{25},{50}]` literal, previously in three pages.
- `usePageItems(pageItemList)` — the sparse-window filter, previously in four.
- `useListPageControls({ filters, pageCurrent, pageItemList, search })` — the above plus
  `handleSearch` and `handleReset`.

Wired into `OrdersList.vue`, `ProductsList.vue`, `UsersList.vue` (all three exports) and
`LocaleEntries.vue` (`usePageItems` only). Net **−75 lines**.

### The case for

`usePageItems` earns its place on its own, and for a better reason than line count. Each inline
copy carried an `eslint-disable @typescript-eslint/no-unnecessary-condition` plus a 130-character
justification, because the toolkit's return type claims the element cannot be falsy while the
array is really sparse. Typing the parameter as what it actually is — `Ref<(T | undefined)[]>` —
makes the filter necessary in the type system's eyes, so **all four suppressions are gone**, not
merely centralised. That is a fix, not a fold.

### The case against

`handleSearch` is two lines. `handleReset` is three. Neither is hard to read, hard to get right,
or likely to drift, and putting them behind a composable means a reader of `UsersList.vue` has to
open a second file to learn that Search resets the page number. The audit called these "5×
duplication"; checked, `handleSearch` is 4× and `handleReset` is 3× — `AdminAuditTab`,
`FeedbackInbox` and `LocalesDictionary` each have their own genuinely different version, and
`LocaleEntries` deliberately has no reset at all because its `filters.tag` comes from the route.
So the shared handlers serve three files, not six, and the composable already needs a paragraph
explaining who must not use it.

### The middle option, if you want one

Keep `PAGE_SIZE_OPTIONS` and `usePageItems`; drop `useListPageControls` and leave `handleSearch`
and `handleReset` inline in the three pages. That takes the suppression fix and the shared
constant — the parts that are unambiguously right — and leaves five lines of obvious code where a
reader already looks for it.

**Recommendation: the middle option.** The sparse-window filter is a real abstraction with a real
reason; the two handlers are a shape, and a shape repeated three times is cheaper to read than to
share.

---

## What landed

| Commit    | Closed                   | Note                                                         |
| --------- | ------------------------ | ------------------------------------------------------------ |
| `8feb3f9` | §1.1 §1.2 §1.3 §1.4      | dead files, 4 dead locale keys, dangling `.md` citation      |
| `2279621` | §2.1                     | six native `confirm()` → `useDialogStore().confirm()`        |
| `b4a6c63` | §2.6 §2.7 §6.9           | `satisfies`, contract envelope types, the last `any`         |
| `c52c156` | §2.3 §2.5 §2.9           | the three copied shapes, named once each                     |
| `b94402a` | §4.1 §4.2 §4.3 §4.4 §4.5 | 192 declarations given their own docblock                    |
| `ab789d8` | §3 §6.6 §6.7             | history narration, 14 unified headers, subdomain prose moved |
| `7e4da18` | §5                       | `@module` scoped to `src/` — option (b)                      |
| `0422fb7` | §6.2 §6.3 §6.4           | docs made true, 83 file rows rewritten, 4 diagrams added     |
| `fbc45c2` | §2.8 §6.8 §6.10          | barrel collapsed, deps moved, three exports narrowed         |

§2.2 (a `useModuleRestApi` wrapper over the 16 stores' `useCoreStore` wiring) was **rejected** and
is not coming back. §6.1 resolved itself: a contract-sync `regenerate` swept up the two unformatted
payments files.

---

## Findings that did not survive checking

Recorded because the same mistakes are easy to repeat.

- **§1.3's `generic` keys are not dead.** `increment`, `count`, `user` and `product` are reached
  through vue-i18n **linked messages** in other dictionaries (`@:generic.user`,
  `@.capitalize:generic.count`), and `it`/`en`/`es` through ``t(`generic.${code}`)`` in
  `AppLanguageSwitcher.vue` and `Profile.vue`. `es` is live specifically because
  `discoverRemoteLocales` **pushes onto `supportedLanguages` at runtime**, so a locale the backend
  offers and this build does not bundle still needs its name. Only the four `account` keys were
  dead. The audit's own warning — "do not bulk-delete from a grep" — applied to its own table.
- **§2.6 does not catch a misspelled `meta` key.** Verified both ways: vue-router's
  `RouteMeta extends Record<PropertyKey, unknown>`, so `acces: 'admin'` type-checks under `as`
  **and** under `satisfies`. The VALUE is checked (`access: 'admni'` is TS2820); the key is not.
  `app/guards/authentications.ts` claimed otherwise and has been corrected. What catches a
  misspelled key is each module's `tests/routes.spec.ts`.
- **§2.3's proposed shape is banned by this repo's own lint.** An `absentAsUndefined` returning
  `undefined` and assigned at the call site trips `@typescript-eslint/no-confusing-void-expression`,
  correctly: it is a guard, not a value. It shipped as `rethrowUnlessAbsent(error, ...statuses)`.
- **§6.9's suggested fix does not compile.** `Cypress.Commands.overwrite` types its callback
  against `Parameters<Chainable['visit']>`, which resolves to the **last** `visit` overload — the
  single `{ url, ...options }` object — while what arrives is the first, `visit(url, options)`.
  `Cypress.CommandOriginalFn<'visit'>` cannot bridge that. It shipped through `asStub`, the repo's
  one sanctioned seam, with the handler's parameters declared honestly so the body stays checked.
- **§4.1 undercounted by 4×.** The real figure was **192** across 60 files, not 46: the original
  sweep counted bare declarations and missed the commoner case of several sharing one docblock,
  which the rule forbids just as squarely.
- **§2.4 overcounted.** "5×" for both handlers; actually 4× and 3× — see above.

---

## Open follow-up, not yet a task

**There is no gate for a dead i18n key.** A `tests/cross-cutting` spec that resolves dynamic key
prefixes would catch the next one, but it must understand every dynamic idiom in the repo —
``t(`generic.${code}`)``, ``t(`navigation.section-${s}`)``, `tm()` tree reads, and **vue-i18n
linked messages**, which is the one this audit's own table tripped over. Worse than nothing if it
gets those wrong.

**`tsconfig.cypress.json` is not in `tsconfig.json`'s `references`,** so `npm run type-check-only`
does not check it and it currently reports ~20 pre-existing errors when run directly (`lib`
resolution, mostly). ESLint's typed linting does cover those files, which is why they are not
invisible — but the two disagree, and that is worth a decision at some point.
