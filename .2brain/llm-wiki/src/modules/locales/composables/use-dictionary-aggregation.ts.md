---
source: src/modules/locales/composables/use-dictionary-aggregation.ts
sha256: 68f206bbf3e73f1ba85bc95d528153525a037f92bd532d7ac1672f3327e42b63
generated_at: 2026-10-02T15:12:57.748076+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/composables/use-dictionary-aggregation.ts

## Purpose

Provides the dictionary board's single read model for per-cell state. It merges three sources — stored locale entries, the API's deployed baseline, and this build's bundled baseline — plus page-local pending keys, into a unified set of lookups (`entryAt`, `baselineAt`, `cellState`) so that the board and the cell editor never read the raw sources directly.

## Key elements

- **`useDictionaryAggregation(tenant: Ref<string>)`** — the sole export. A Vue composable parameterized by the active tenant ID. Returns the full set of computeds, refs, and helpers listed below.
- **`tenantKind`** (computed) — resolves the tenant's `LocaleTenantKind` from the registry; defaults to `frontend` if not found.
- **`hasBaseline`** (computed) — whether the current tenant has a readable baseline (own bundle or API files).
- **`languages`** (computed) — writable language columns; excludes `static`-only languages that have no entries collection.
- **`entriesByTag`**, **`apiBaselines`**, **`appBaselines`**, **`pendingKeys`** (refs) — the four raw data holders, populated by `loadLanguage`.
- **`entriesIndex`** (computed) — per-language `Map<key, LocaleEntry>` filtered to the shown tenant.
- **`baselines`** (computed) — selects the appropriate baseline source (app or API) based on tenant.
- **`entryAt(tag, key)` / `baselineAt(tag, key)` / `isMissing(tag, key)` / `cellState(tag, key)`** — cell-level queries returning the entry, baseline text, missing flag, or a `'entry' | 'baseline' | 'missing'` state respectively.
- **`allKeys`** (computed) — sorted union of all entry keys, baseline keys, and pending keys across languages.
- **`missingByTag`** (computed) — per-language count of missing keys, for header badges.
- **`loadBoard()`** — fetches tenants + languages, then all writable language columns in parallel.
- **`loadLanguage(tag)`** — fetches entries, API baseline, and bundled baseline for one language and writes them into the local refs.
- **`afterWrite(tag)`** — post-mutation refresh: reload the language column, re-fetch the manifest counts, and push the running locale override.
- **`addPendingKey(key)` / `resetPendingKeys()`** — manage the page-local set of keys added in the UI but not yet backed by an entry.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — reached indirectly through `@/infrastructure/utils/errors.ts`: `loadBoard`'s `.catch` calls `notifyErrorMessages(addMessage, error)`, which is the error-surface path that the logger underpins.

## Notes

- The `tenant` ref is owned by the **caller**, not by this composable. Switching tenants is a page-level action (resets current page, drafts) and must be coordinated outside this module.
- `pendingKeys` is intentionally ephemeral and tenant-scoped: call `resetPendingKeys()` on every tenant switch so stale keys from a previous board don't leak into the new one.
- `loadLanguage` populates all three sources for a tag in a single `Promise.all`; partial failure leaves the previous value for that tag intact (the refs are only overwritten on full success).
- `entriesIndex` re-filters the full `entriesByTag` on every tenant change; entries for *other* tenants remain in the ref but are invisible through the index until the tenant ref changes.
