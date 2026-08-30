# src/modules/locales/composables/use-dictionary-aggregation.ts

## Purpose

Vue composable that merges the dictionary board's three data sources — stored entries, the API's deployed baseline, and this build's bundled baseline — plus in-page pending keys into a single per-cell read model. The board and cell editor query cell state through this composable rather than reading the raw sources, giving "what is this cell" exactly one answer.

## Key elements

- **`useDictionaryAggregation(tenant: Ref<string>)`** — the sole export; takes a reactive tenant ref owned by the caller and returns all board-level state and actions.
- **`tenantKind` / `hasBaseline`** — computed; determine which baseline source (if any) applies to the current tenant.
- **`languages`** — computed; writable languages (excludes `static`-only ones with no entries collection).
- **`tenantOptions`** — computed; the tenant `<select>` dropdown options from the registry.
- **`entriesIndex` / `baselines`** — computed maps keyed by language tag; the filtered, per-tenant entry index and the applicable baseline dictionary.
- **`entryAt` / `baselineAt` / `isMissing` / `cellState`** — per-cell lookup helpers returning the stored entry, baseline text, gap flag, or a tri-state (`'entry' | 'baseline' | 'missing'`).
- **`allKeys`** — computed; the sorted union of all baseline keys, entry keys, and pending keys.
- **`missingByTag`** — computed; per-language count of missing keys.
- **`loadBoard` / `loadLanguage`** — fetch the registry + every language column, or a single column (entries + both baselines).
- **`afterWrite`** — post-write refresh: reload the column, refresh the language manifest counts, and push live overrides into the running app.
- **`addPendingKey` / `resetPendingKeys`** — manage keys added in-page but not yet saved; `resetPendingKeys` is called on tenant switch.
- **`applyLiveOverrides`** (module-private) — re-fetches overrides for one tag and applies them via `updateLocale`; intentionally swallows errors so a failed live refresh never surfaces as an error toast after a successful save.

## Relationships

- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — the unit-test suite exercising this composable's cell lookups, key aggregation, and load/after-write flows.

## Notes

- **`tenant` is caller-owned.** Switching tenants is a page-level action (resets page, drafts) that this composable does not handle; it simply re-derives everything reactively from the ref.
- **`applyLiveOverrides` never throws.** The `.catch(() => undefined)` is deliberate: the board's state is already correct after a save, so a failed courtesy refresh must not produce an error toast.
- **`static`-only languages are excluded** from `languages` and therefore never rendered as board columns — there is no entries collection to write a cell into.
- **`pendingKeys` is not tenant-filtered internally.** It is a flat list managed by the caller; the caller must call `resetPendingKeys` on tenant switch to avoid leaking keys across tenants.
