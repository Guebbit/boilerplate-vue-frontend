# Polish plan — the record

Audit date **2026-09-07**. Every phase landed the same day, across twelve commits. Nothing is
outstanding; what follows is the record, including the findings that did not survive checking.

---

## Where the gates stand

| Check                                       | Result                                 |
| ------------------------------------------- | -------------------------------------- |
| `npm run lint` (`--max-warnings 0`)         | **clean**                              |
| `npm run prettier:check`                    | **clean**, whole tree                  |
| `npm run type-check-only`                   | **clean**                              |
| `npm run build`                             | **clean**                              |
| `npm run docs:build`                        | **clean**                              |
| Unit suite                                  | **1633/1633**                          |
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

## §2.4 — closed, and not the way it was proposed

The audit proposed folding four list views' duplicated `pageItems`, `PAGE_SIZE_OPTIONS`,
`handleSearch` and `handleReset` into one `useListPageControls` composable. That composable was
written, wired and verified — and then thrown away, because checking its central premise showed
there was nothing to abstract.

**The four `pageItems` computeds were dead code.** Each carried an
`eslint-disable @typescript-eslint/no-unnecessary-condition` asserting that "the toolkit's page
window is a SPARSE array; holes are undefined at runtime whatever the element type claims". It is
not. `pageItemList` resolves through `searchGet` → `getRecords`, which ends in `.filter(Boolean)`,
so a record the cache names but the dictionary does not hold makes the window SHORTER — it never
leaves a hole. The rule was correct at all four sites and the suppressions existed to protect a
filter that removed nothing.

Verified against the real package on both entry points, including `useStructureCrudApi` — what
every list store here is built on. The probes are kept as
`tests/cross-cutting/page-window-density.spec.ts`.

**The trap worth remembering.** The first attempt at this section did not check. It carried the
"sparse" claim over from the comments it was consolidating and then gave the new composable a
parameter typed `Ref<(T | undefined)[]>` — which made the filter look necessary to the type
checker and let the suppressions be deleted for the wrong reason. A consolidation that inherits an
unverified claim launders it: four suspicious comments become one confident abstraction, and the
error gets harder to see rather than easier.

Shipped as `ff8bb53`: the four filters deleted, the tables bound to `pageItemList` directly,
−40 lines and no new abstraction. **No change to `@guebbit/vue-toolkit`** — it was already correct,
and this repo was working around behaviour it does not have.

**Deliberately left inline:** `PAGE_SIZE_OPTIONS` (3x) and `handleSearch`/`handleReset` (4x and 3x,
two and three lines each). The audit called the handlers "5x"; checked, `AdminAuditTab`,
`FeedbackInbox` and `LocalesDictionary` each have a genuinely different version, and
`LocaleEntries` has no reset at all because its `filters.tag` comes from the route. Three call
sites of a two-line shape, with no defect underneath, reads cheaper than it shares.

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
| `ff8bb53` | §2.4                     | four dead filters deleted; the toolkit already did the work  |

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
- **§2.4 overcounted, and mis-diagnosed.** "5×" for both handlers; actually 4× and 3×. And
  the `pageItems` duplication it led with was four copies of dead code — see the section above.

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
