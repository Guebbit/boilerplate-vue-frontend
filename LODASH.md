# Lodash replacement candidates

`lodash`/`lodash-es` is **not currently a dependency** of this project. Most
cross-cutting helpers already come from `@guebbit/js-toolkit`. This is an
audit of hand-rolled code that overlaps with common lodash functions, in case
we want to pull in `lodash-es` (or just note that we don't need to).

## 1. `mergeDictionaries` — duplicated deep-merge (the main finding)

Two independent, near-identical recursive deep-merge implementations, same
folder, same exported name:

- `src/infrastructure/i18n/merge-dictionaries.ts` (~11 lines)
- `src/infrastructure/i18n/locale-overrides.ts` (~35 lines, local to `withLocaleOverrides`)

Overlaps with `merge` / `mergeWith`. **This is the first thing to fix
regardless of lodash** — collapse the two into one shared function.

Caveats before swapping in lodash:

- **Arrays are treated as opaque leaves**, replaced whole rather than merged
  by index. Comment in `locale-overrides.ts`: _"a translated list is edited
  whole or not at all, and merging two arrays by index would produce a
  sentence half in each language."_ Plain `_.merge` merges arrays by index —
  wrong here. Would need `mergeWith(base, extra, (a, b) => Array.isArray(b) ? b : undefined)`.
- **Non-mutating** (`{ ...base }` spread over the top level, recursing).
  `_.merge`/`_.mergeWith` mutate the first argument. Callers would need
  `mergeWith(structuredClone(base), extra, customizer)` to preserve the
  current contract.

Net: replaceable, but not with a bare `_.merge` call — needs a customizer,
which shrinks the win. Consider it, but dedupe the two copies first either way.

## 2. `expandEntries` / `foldNumericNodes` — dotted-key → nested object

`src/modules/locales/dictionaries.ts` (~93 lines total)

Builds a nested object from dotted flat keys, then folds numeric-keyed nodes
into arrays. Overlaps with `set` / `zipObjectDeep`, which already fold
numeric path segments into arrays.

Custom behavior lodash doesn't have: **"deeper key wins"** collision
handling — a shallower leaf is silently dropped if a deeper key for the same
path shows up later. `_.set` has no such policy (it overwrites/coerces), so
this guard logic would need to stay even if the traversal scaffolding were
replaced.

## 3. `toPascalCase` — codegen script

`scripts/generate-asyncapi-types.ts:90-96` (7 lines)

Overlaps with `upperFirst` + `words`/`camelCase` (`_.words(value).map(_.upperFirst).join('')`).
Low priority — small, isolated, used only in codegen.

## 4. `groupChannelsByNamespace` — codegen script

`scripts/generate-asyncapi-types.ts:245-254` (10 lines)

Overlaps with `groupBy`, except it returns a `Map` (lodash returns a plain
object) and silently skips falsy namespace segments, where `_.groupBy` would
create a `""`/`undefined` bucket. Would need wrapping either way.

## 5. `sortNavigation` / `groupNavigation`

`src/kernel/registry.ts:~317-330` (~13 lines)

Overlaps with `sortBy` and `groupBy`. Not worth it:
`groupNavigation` pre-seeds all three section buckets (`main`, `account`,
`admin`) as empty arrays so consumers can index without a guard — `_.groupBy`
only creates keys that occur, so a swap would need extra merging code. The
native `toSorted`/`for..of` version is already simple and dependency-free.

## 6. Inline "omit one key" pattern (not extracted, recurring)

- `src/modules/locales/views/LocaleEntries.vue` — `handleValueBlur` (~lines 170-174)
- `src/modules/locales/views/LocalesDictionary.vue` — `forgetError`/`markSaved` (~lines 118-135)

```ts
savedRows.value = Object.fromEntries(
    Object.entries(savedRows.value).filter(([id]) => id !== entry.id)
);
```

Overlaps with `omit`. Trivial (3 lines), duplicated across two files rather
than centralized — a lodash `omit` call would be marginally shorter but not
meaningfully safer. Low priority.

## Not found

No hand-rolled `debounce`, `throttle`, `cloneDeep` (native `structuredClone`
is used instead, e.g. `src/infrastructure/i18n/index.ts:170,199`), `isEqual`,
`pick`, `keyBy`, `uniq`/`uniqBy`, `chunk`, `memoize`, or `get`/`set`-style
safe path accessors anywhere in `src/` or `scripts/`.

## Recommendation

- **Do first, independent of lodash:** dedupe the two `mergeDictionaries`
  implementations into one.
- **Worth a `lodash-es` dependency if we do it:** the merge, if we want the
  customizer-based version instead of hand-rolled recursion — this is the
  only case with real, hard-to-get-right logic (array leaf semantics).
- **Not worth it:** everything else (#2-#6) is either too small, has custom
  behavior lodash doesn't replicate for free, or is already dependency-free
  and simple. Adding `lodash-es` just for these would be a net cost.
