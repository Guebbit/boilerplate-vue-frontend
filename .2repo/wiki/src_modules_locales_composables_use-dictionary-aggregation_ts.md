# src/modules/locales/composables/use-dictionary-aggregation.ts

## Purpose

Vue composable that merges three locale data sources—stored entries, the API's deployed baseline, and the build's bundled baseline—plus page-local pending keys, into a single per-cell read model. The dictionary board and cell editor query cell state through this composable rather than reading the raw sources, giving "what is this cell" exactly one answer.

## Key elements

- **`useDictionaryAggregation(tenant: Ref<string>)`** — sole export; returns all refs, computeds, and action functions for the board.
- **`applyLiveOverrides(tag)`** — internal; re-fetches and re-applies a language's i18n bundle to the running app after a write. Swallows errors so a courtesy refresh never toasts.
- **`entriesByTag` / `apiBaselines` / `appBaselines`** — the three source refs (entries by tag, API baseline by tag, bundled baseline by tag).
- **`pendingKeys`** — keys added on the page but not yet saved to any backend.
- **`entriesIndex`** (computed) — per-language `Map<key, LocaleEntry>` filtered to the current tenant.
- **`baselines`** (computed) — picks `appBaselines` for own tenant, `apiBaselines` for backend tenants, `{}` otherwise.
- **`entryAt` / `baselineAt` / `isMissing` / `cellState`** — per-cell lookup helpers returning the stored entry, baseline text, gap status, or a three-way state (`'entry' | 'baseline' | 'missing'`).
- **`allKeys`** (computed) — sorted union of all entry keys, baseline keys, and pending keys.
- **`missingByTag`** (computed) — per-language count of keys with neither entry nor baseline.
- **`loadBoard` / `loadLanguage` / `afterWrite`** — data-loading and post-write refresh orchestration.
- **`addPendingKey` / `resetPendingKeys`** — manage the unsaved-key list (reset on tenant switch).
- **`languages`** (computed) — writable languages (excludes `static`-only).
- **`tenantKind` / `hasBaseline` / `tenantOptions`** — derived from the Pinia `localesStore`.

## Relationships

- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — unit-test suite covering the composable's cell lookups, `allKeys` union, `missingByTag` counts, and `afterWrite` behavior.
- (The dependency graph also lists `src/infrastructure/utils/logger.ts`, but this file does not import it; no direct interaction.)

## Notes

- `tenant` is passed in as a `Ref` and is **not** mutated here; switching tenants is the caller's responsibility and should also call `resetPendingKeys`.
- `loadBoard` catches all errors and routes them through `notifyErrorMessages`; individual `loadLanguage` calls do not.
- `applyLiveOverrides` intentionally resolves to `undefined` on failure—by design, a live-refresh hiccup must not surface as a user-visible error after a successful save.
- `allKeys` uses `Array.toSorted()` (ES2023), not in-place `sort`.
