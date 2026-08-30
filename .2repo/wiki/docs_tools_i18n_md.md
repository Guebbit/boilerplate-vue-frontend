# docs/tools/i18n.md

## Purpose

Explains how the frontend resolves display text across three tiers — bundled locale files, API-stored overrides, and per-key deep merging — and documents the rules, scopes, and boundaries of that system so contributors understand what the client does (and deliberately does not) fetch.

## Key elements

- **`withLocaleOverrides` merge** — deep, per-key merge of `src/locales/<locale>.json` with API override rows; neither side is mutated; arrays are replaced whole (not index-merged).
- **Language discovery** — the switcher list starts as the `src/locales/` folder contents and is extended at boot by the API manifest; there is no environment variable list.
- **Two scopes (`app` / `api`)** — `app` means a dictionary can be downloaded; `api` means the API can answer in that language. Neither is validated against the other.
- **`translate()`** — a key-lookup usable outside any component; designed for Zod schema error thunks (`error: () => translate('…')`) so one module-scope schema speaks every language at parse time.
- **"Offline floor" invariant** — every resolver returns rather than rejects; the app is fully functional when all resolvers return nothing.
- **"What this does not fetch"** — the API's own dictionary and its `api`-scoped overrides never reach the frontend; they are resolved server-side.

## Relationships

- **`src/locales/`** — provides the bundled `<locale>.json` files that form the base layer of the merge; the folder's contents define which languages are renderable with zero network.
- **`docs/tools/admin-dashboard.md`** — documents the screens where non-developers edit the override rows that this system merges over the bundled files.

## Notes

- The merge is **deep, per-leaf**. A shallow assign would silently drop sibling keys. Arrays are treated as leaves and replaced in their entirety.
- `translate()` does **not** re-translate an error already rendered on screen; pass `{ revalidateOn: locale }` to the form-validation composable to refresh displayed messages on locale switch.
- `tests/cross-cutting/schemas-i18n.spec.ts` asserts every Zod error key resolves to a real string, preventing raw keys from reaching users.
- A half-translated locale (some keys overridden, others still bundled) is an **expected, usable state**, not an error condition.
- The frontend and backend share a top-level `generic` key; merging the API's `api`-scoped rows client-side would collapse two distinct keyspaces.
