# Polish plan — SOLID / DRY / KISS, CLAUDE.md compliance, dead code

Audit date: **2026-09-07** · branch `main` · **phases 1–4 landed 2026-09-07**.

What follows is what is **left**. Everything the first four commits closed has been deleted from
this file rather than crossed out — git holds the record, and a plan is a list of work not yet
done.

---

## 0. Where the gates stand

| Check                                 | Result                                               |
| ------------------------------------- | ---------------------------------------------------- |
| `npm run lint` (`--max-warnings 0`)   | **clean**                                            |
| `npm run prettier:check`              | **clean**, whole tree                                |
| `npm run type-check-only`             | **clean**                                            |
| `npm run build`                       | **clean**                                            |
| Unit suite                            | **1630/1630**                                        |
| Control-flow nesting > 3 levels       | **none**, repo-wide                                  |
| `any` anywhere                        | **none** — the last one is gone, see the closed §6.9 |
| `@ts-ignore` / `@ts-expect-error`     | **none**, repo-wide                                  |
| `try`/`catch` in `src/`               | 3, all justified — see §6.5, no action               |
| `async`/`await` in `src/`             | **none** (promise chaining throughout)               |
| i18n key parity `en.json` ↔ `it.json` | **complete**, all 15 dictionaries                    |
| `VITE_*` used vs `.env-example`       | **complete parity**                                  |
| Native `confirm()` in `src/`          | **none**                                             |

---

## What landed, and what it cost

| Commit    | Closed              | Note                                                    |
| --------- | ------------------- | ------------------------------------------------------- |
| `8feb3f9` | §1.1 §1.2 §1.3 §1.4 | dead files, 4 dead locale keys, dangling `.md` citation |
| `2279621` | §2.1                | six native `confirm()` → `useDialogStore().confirm()`   |
| `b4a6c63` | §2.6 §2.7 §6.9      | `satisfies`, contract envelope types, the last `any`    |
| `c52c156` | §2.3 §2.5 §2.9      | the three copied shapes, named once each                |

Also closed without a commit of its own: **§6.1** — the working tree's two unformatted payments
files were swept up by a contract-sync `regenerate` run; `prettier:check` is clean tree-wide.

**Three findings in the original audit did not survive checking.** Recorded here because the same
mistake is easy to repeat:

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
  `app/guards/authentications.ts` claimed otherwise in its docblock and has been corrected.
  What actually catches a misspelled key is each module's `tests/routes.spec.ts`.
- **§2.3's proposed shape is banned by this repo's own lint.** An `absentAsUndefined` returning
  `undefined` and assigned at the call site trips
  `@typescript-eslint/no-confusing-void-expression`, correctly: it is a guard, not a value. It
  shipped as `rethrowUnlessAbsent(error, ...statuses)`.

Likewise **§6.9's suggested fix does not compile.** `Cypress.Commands.overwrite` types its
callback against `Parameters<Chainable['visit']>`, which resolves to the **last** `visit`
overload — the single `{ url, ...options }` object — while what arrives is the first,
`visit(url, options)`. `Cypress.CommandOriginalFn<'visit'>` cannot bridge that. It shipped
through `asStub`, the repo's one sanctioned seam, with the handler's own parameters declared
honestly so the body stays checked.

---

## 2. SOLID / DRY / KISS — what is left

### 2.4 List-view duplication — four near-identical pages

`ProductsList.vue`, `UsersList.vue`, `OrdersList.vue`, `LocaleEntries.vue` (and partly
`FeedbackInbox.vue`, `AdminAuditTab.vue`) repeat, verbatim:

| Duplicated thing                                                               | Count | Where it should live                      |
| ------------------------------------------------------------------------------ | ----- | ----------------------------------------- |
| `pageSizeOptions = [{10},{25},{50}]`                                           | 3×    | one exported constant in `src/ui/`        |
| `pageItems` sparse-filter computed **+ its 130-char `eslint-disable` comment** | 4×    | `usePageItems()` in `src/ui/composables/` |
| `handleSearch` (reset to page 1, search)                                       | 5×    | same composable                           |
| `handleReset` (clear filters, page 1, `search(true)`)                          | 5×    | same composable                           |
| The `synthetic` image-column rationale comment                                 | 2×    | `data-table-headers.ts`, once             |

The sparse-array one is the worst: an `eslint-disable` **and** its justification, copy-pasted
four times. When the toolkit stops returning a sparse window, four suppressions go stale and
nothing notices.

**Action.** One `useListPageControls({ filters, pageCurrent, pageItemList, search })` composable
in `src/ui/composables/`, returning `{ pageItems, handleSearch, handleReset }`, plus a shared
`PAGE_SIZE_OPTIONS`.

**Note.** `useListPage` was removed on 2026-07-14 in favour of the toolkit's
`useStructureSearchApi`/`watchSearch`, and that was right — the store half belonged to the
toolkit. This is the _view_ half, which the toolkit does not own and which drifted back into
five copies. Keep the new composable strictly presentational so it does not become the old one.

### 2.8 Barrel-on-a-barrel

`src/types/api.ts` is one line, `export * from '@api'`, and `src/types/index.ts` re-exports it
alongside two real modules. Two hops to reach the generated types.

Low severity, and there is a readability argument for the symmetry of the barrel. Noted so the
decision is made on purpose rather than inherited. **Recommendation:** collapse `api.ts` into
`index.ts` as `export * from '@api';` with the existing comment.

---

## 3. CLAUDE.md § Comments — history narration

> _"Never narrate history — no 'this used to…', 'previously…', 'was renamed from…'. A comment
> describes the code as it is now; git log is where the past lives."_

Ten confirmed violations, several of them in prominent module headers:

| File:line                                              | The narration                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `tests/cross-cutting/backend-pairing.spec.ts`          | a whole **"── Where this came from ──"** section on `scripts/module-docs/pairing.ts`           |
| `tests/cross-cutting/module-file-shapes.spec.ts`       | a second **"── Where this came from ──"** section, same removed generator                      |
| `tests/cross-cutting/a11y-coverage.spec.ts`            | _"The first version of this guard asked only whether…"_                                        |
| `tests/cross-cutting/form-idiom.spec.ts`               | _"even though there is no longer one composable … `useAppForm` was removed as a thin wrapper"_ |
| `tests/cross-cutting/mutation-safe-imports.spec.ts`    | _"which is why this ran undiagnosed long enough for the baseline to go stale"_                 |
| `src/infrastructure/http/response-schema-map.ts:85`    | _"The admin surface that once sat beside them here has moved into the `locales` module"_       |
| `src/kernel/registry.ts:49`                            | _"restating it here is exactly what once let the menu and the router disagree"_                |
| `src/kernel/registry.ts:133`                           | _"for what used to live here as typed fields and why it moved"_                                |
| `src/kernel/registry.ts:174`                           | _"the enforceable half of what used to be a `dependsOn` field"_                                |
| `src/modules/account/views/Profile.vue:16`             | _"rather than … where it used to sit"_                                                         |
| `src/modules/cart/composables/use-line-quantity.ts:15` | _"The steppers used to call the store's `updateCartItem` on every click"_                      |
| `src/modules/locales/views/LocalesDictionary.vue:119`  | _"That used to be solved by not filtering until Search"_                                       |

**How to fix, not just delete.** Most of these are carrying a real _reason_ inside a historical
frame. Rewrite forward, do not truncate:

- ✗ _"restating it here is exactly what once let the menu and the router disagree"_
- ✓ _"An entry's permissions come from its route. A second copy here could disagree with it."_

- ✗ _"This table used to live in `scripts/module-docs/pairing.ts` … the generator is gone"_
- ✓ _"These are rules, not documentation, so they live with the rules."_

The `registry.ts:133` and `:174` cases already point at `docs/theory/strategic-ddd.md` — keep the
pointer, drop the "used to". That is precisely the split CLAUDE.md asks for: _"the reasoning …
live[s] in `docs/`."_

---

## 4. CLAUDE.md § Code layout

> _"Every top-level declaration gets JSDoc … One blank line between them."_

### 4.1 46 undocumented top-level declarations

Full list generated mechanically (indent-0 declarations in `src/`, tests excluded). Highest
concentration in `account/views/`, where `const route = useRoute();` and
`const router = useRouter();` sit bare in **eight** files:

```
src/app/components/ReauthDialog.vue:18,26
src/infrastructure/utils/logger.ts:88,89
src/modules/account/components/ProfileSessions.vue:35
src/modules/account/components/ProfileAvatar.vue:30
src/modules/account/components/TwoFactorEnroll.vue:39
src/modules/account/components/ProfileTwoFactor.vue:30,73
src/modules/account/views/AccountDeleteConfirm.vue:34,35,39
src/modules/account/views/VerifyEmailConfirm.vue:40,41,45
src/modules/account/views/PasswordResetRequest.vue:30
src/modules/account/views/PasswordResetConfirm.vue:39,40,44
src/modules/account/views/OAuthCallback.vue:22,23
src/modules/account/views/Signup.vue:46,47,93
src/modules/account/views/TwoFactorChallenge.vue:29,31
src/modules/account/views/Login.vue:44,45,72
src/modules/account/views/Profile.vue:42,43,83
src/modules/account/stores/profile.ts:52        ← the store definition itself
src/modules/delivery/components/ShipmentPanel.vue:34
src/modules/orders/views/Order.vue:63
src/modules/orders/views/OrderEdit.vue:97
src/modules/users/views/UserCreate.vue:41
src/modules/payments/components/PaymentPanel.vue:42,51
src/modules/locales/views/LocalesDictionary.vue:65
src/modules/locales/views/LocalesList.vue:45
src/modules/locales/views/LocaleEntries.vue:51,53
src/modules/locales/components/LanguageFormDialog.vue:30
src/ui/organisms/DialogHost.vue:26,39
```

`src/modules/account/stores/profile.ts:52` is the standout: **the only store in the repo whose
`defineStore` call has no docblock.** Every other one has a paragraph.

### 4.2 11 pairs with no blank line between them

Same files, the `route`/`router` and `titleId`/`messageId` pairs:
`ReauthDialog.vue:26`, `logger.ts:89`, `AccountDeleteConfirm.vue:35`,
`VerifyEmailConfirm.vue:41`, `PasswordResetConfirm.vue:40`, `OAuthCallback.vue:23`,
`Signup.vue:47`, `Login.vue:45`, `Profile.vue:43`, `OrderEdit.vue:97`, `DialogHost.vue:39`.

### 4.3 One JSDoc covering two declarations

`src/modules/users/views/UsersList.vue:26-34` — _"Generic translation and notification
accessors."_ documents both `t` and `addMessage`; _"Users store actions and reactive
list/pagination state."_ documents both the action destructure and the `storeToRefs` one.
`ProductsList.vue` does the same four declarations correctly, one docblock each. Use
`ProductsList.vue` as the model.

### 4.4 Orphaned JSDoc block

`src/infrastructure/session.ts:20-27` — a docblock (_"The visitor's session: a token, and the
least the app must know…"_) is followed immediately by a second docblock, so the first attaches
to nothing. Its content is genuinely useful; merge it into the `SessionViewer` block below it or
into the `@module` header.

### 4.5 Interfaces with half their fields documented

> _"An interface states its purpose and what each field means."_

- `src/infrastructure/session.ts:31` `SessionViewer` — `id`/`email`/`admin` bare,
  `imageUrl`/`thumbnailUrl` documented.
- `src/infrastructure/http/response-schema-map.ts:43-47` `ResponseSchemaRoute` — three bare
  fields under a docblock that is otherwise the longest in the tier.

---

## 5. CLAUDE.md § Comments — `@module` headers

> _"Every `.ts` file: a JSDoc `@module` header at the top."_

**Coverage today:** every `.vue` file has one, and every `src/` `.ts` file except one.
`scripts/**` (13 files) and `tests/**` (79 files) have none.

The linter does not enforce it there — `eslint.config.ts:793` scopes `jsdoc/*` to `src/**` and
excludes `src/modules/*/tests/**`. But the author's own practice **does**: 26 of 28 spec files
under `src/modules/*/tests/` carry an `@module` header despite being exempt. The two that do
not are the outliers, not the rule:

```
src/infrastructure/observability/analytics-events.ts   ← deleted by §1.1 anyway
src/modules/delivery/tests/store.spec.ts
src/modules/payments/tests/store.spec.ts
src/modules/payments/tests/use-order-refund.spec.ts
```

**Decision needed — this is a fork in the road, and it is yours:**

- **(a) The rule means what it says.** Add `@module` to 92 files in `scripts/` and `tests/`, and
  widen the eslint `files:` glob so it stays true. Large one-off diff; the gate then holds it.
  Note that `tests/cross-cutting/*.spec.ts` already open with substantial file-level docblocks —
  they are `@module` headers missing only the tag.
- **(b) The rule means `src/`.** Amend CLAUDE.md to say so, and fix the four files above.
  Small, honest, and stops the rule from being one nobody follows.

I recommend **(b) plus the tag on `tests/cross-cutting/`** — those nine files carry the repo's
architectural invariants and read like documentation already; `scripts/` and `tests/e2e/` are
better served by their existing prose. But this is a taste call about your own rule.

---

## 6. Consistency, docs and smaller items

### 6.2 `docs/modules/realtime.md` contradicts itself and the code

- **Line 32:** _"One screen, one feed component, one composable — and **no store**, which is the
  unusual part."_
- **Line 13** of the same file: _"**Store** — `realtime-observability`"_.
- **Line 55** of the same file documents that store's public surface.
- `src/modules/realtime/store.ts` exists, 100+ lines, `defineStore('realtime-observability')`.

The "no store" paragraph is stale, and it is the paragraph a reader trusts most because it is
the one written as prose. There is also **no `components/` directory** in the module, so "one
feed component" is wrong too.

**Action.** Rewrite "The story" against the code as it stands.

### 6.3 Generator-leftover boilerplate in module docs

`docs/modules/realtime.md:91-93` gives three different files —
`tests/routes.spec.ts`, `tests/store.spec.ts`, `tests/use-realtime-observability.spec.ts` — the
identical description _"Vitest suite — the store, the routes and the rules, in isolation."_
`module-file-shapes.spec.ts`'s own docblock explains why: these descriptions came from
`scripts/module-docs/shapes.ts`, which rendered the **Files** table, and the pages are now
hand-written. Worth a sweep across all 18 module pages — either write real per-file descriptions
or drop the column.

### 6.4 Docs that describe flow without a Mermaid diagram

> _"Docs describing flow, architecture or process MUST include Mermaid diagrams."_

Fifteen `docs/**` pages have no `mermaid` block. Most are legitimately reference tables
(`theory/glossary.md`, `reference/root.md`, `tools/package-scripts.md`). These four do describe a
flow and should get one:

| File                       | The flow it describes without drawing it                                       |
| -------------------------- | ------------------------------------------------------------------------------ |
| `docs/modules/realtime.md` | SSE connect → snapshot → capped feed → reconnect                               |
| `docs/modules/locales.md`  | dictionary merge: bundled → `/locales` manifest → per-key overrides            |
| `docs/modules/feedback.md` | contact submit → inbox → status transitions                                    |
| `docs/api/endpoints.md`    | it _says_ "response shape" and links onward, but never draws the envelope path |

### 6.5 The three `try`/`catch` blocks — verified, keep all three

CLAUDE.md says _avoid unless genuinely necessary_. All three are:

- `src/app/router/index.ts:195` — an observability failure must not abort a navigation.
- `src/infrastructure/create-sse-client.ts:47` — `JSON.parse` has no non-throwing form.
- `src/modules/locales/components/EntriesImportDialog.vue:117` — same, hand-typed JSON.

Each carries an `eslint-disable` with a written justification. **No action.** Listed so the next
audit does not re-litigate them.

### 6.6 `response-schemas.ts` header wording drifts across 14 files

Same file, same job, 14 different `@module` paragraphs — _"Declares the response-envelope
schema…"_, _"Maps each … endpoint's method + path pattern…"_, _"A flat list of {method, URL
pattern, schema} rows…"_, _"Table of `{ method, pattern, schema }` rows…"_. Likewise the
export's docblock: some say _"Registered through the module manifest, so enabling the domain
turns its contract validation on and deleting the folder turns it off"_, others give a
one-line version.

Harmless individually; collectively it is 14 chances to describe one mechanism differently.
**Action:** pick one wording (the `account` one is the fullest) and make the other 13 match.

### 6.7 Subdomain prose attached to the wrong field

Every `module.ts` puts a block comment immediately above `routes:` that says nothing about
routes — it is the core/supporting/generic subdomain classification:

```ts
export default {
    name: 'admin',
    /*
     * An ops console over endpoints the server already exposes. Interchangeable with any
     * off-the-shelf dashboard, and the first thing a downstream project without ops deletes.
     */
    routes,
```

The typed `subdomain` field was removed on 2026-08-29 and this prose is its replacement — the
right call. But a comment sitting on `routes` reads as documentation _of_ `routes`. Move each
one into the default export's docblock, where the rest of the strategic-DDD prose already lives.

### 6.8 Build-time plugins in `dependencies`

`vite-plugin-vuetify` and `@tailwindcss/vite` are in `dependencies` but referenced only by
`vite.config.ts`. They belong in `devDependencies`. Cosmetic for an app (nothing installs this
as a library), but it misstates the runtime surface — and `docs/tools/package-dependencies.md:36`
claims _"Most heavy tooling … is in `devDependencies`"_, which these two contradict.

While there: `@tanstack/query-core` is in `dependencies` with **zero** direct imports. It is
correct — a required peer of `@guebbit/vue-toolkit@4` — but nothing says so. One line in
`docs/tools/package-dependencies.md` saves the next person the same investigation.

### 6.10 Over-exported types

Nine exported types are referenced only inside their own file: `LogLevel`, `LogScope`
(`logger.ts`), `DialogRequest`, `DialogEntry` (`ui/dialog.ts`), `LocaleEntriesFilters`
(`locales/store.ts`), `SseClient` (`create-sse-client.ts`), `SessionViewer` (`session.ts`),
`CoreDataTableFieldHeader`, `CoreDataTableSyntheticHeader` (`data-table-headers.ts`).

Most are the declared return or parameter type of an exported function and **must** stay
exported for consumers to name — `SessionViewer` and `SseClient` especially. Genuinely
narrowable: `DialogEntry` (internal queue shape, never crosses the boundary) and the two
`CoreDataTable*Header` halves (only `CoreDataTableHeader`, the union, is consumed).

Lowest-value item in this document. Listed for completeness.

---

## 7. What is left, in the order it should go

Each phase is independently committable and leaves `npm run complete` green.

| #   | Phase                  | Contents                                | Size              | Risk                       |
| --- | ---------------------- | --------------------------------------- | ----------------- | -------------------------- |
| 5   | **DRY the list views** | §2.4                                    | medium            | medium — needs supervision |
| 6   | **Comment compliance** | §3 history, §4 layout, §6.6 §6.7        | large, mechanical | none                       |
| 7   | **Docs truth**         | §6.2 §6.3 §6.4                          | medium            | none                       |
| 8   | **Decide, then apply** | §5 `@module` scope — needs a call first | varies            | none                       |
| 9   | **Optional**           | §2.8 barrel, §6.8 deps, §6.10 exports   | small             | none                       |

Phase 6 is the largest diff and the lowest risk — its own commit, so it never obscures a
behavioural change in review.

**Two things to settle before phase 6 starts.**

1. **§4.1's list must be regenerated, not read.** It was produced mechanically on the pre-phase-1
   tree, and four of the phases' commits moved lines in files it names. The finding stands; the
   line numbers do not.
2. **§5 is a question, not a task.** It cannot be executed until (a) or (b) is chosen — see the
   section.

---

## 8. What was deliberately NOT flagged

So the next audit does not re-open them:

- **`useServerPageTotal` (`src/ui/composables/use-server-page-total.ts`)** is a `ref(0)` plus a
  setter — technically a KISS candidate. Its docblock earns it: it names the exact bug it exists
  to prevent (a French locale search reporting a phantom second page) and the toolkit comment
  that sanctions the approach. Keep.
- **The two `<v-badge>` copies** in `AppNavMenu.vue` / `AppNavigation.vue`.
  `tests/cross-cutting/badge-name.spec.ts` argues explicitly for pinning the invariant instead of
  folding the components, and is right. Keep.
- **`src/modules.ts`'s explicit module list** — not auto-discovering is the documented decision.
- **The `response-schemas.ts` route tables** — data, not logic. The repetition is the format.
- **Store `fetchAny(() => api().then(r => { ref.value = r.data.x; return ref.value; }))`,
  27 occurrences.** A `storeInto(ref, pick)` helper would shorten each by two lines and make
  every store harder to read for the sake of it. The shape _is_ the store's contract. Left alone.
- **`@tanstack/query-core` as an unused direct dependency** — correct as a peer; only the
  documentation gap is filed (§6.8).
