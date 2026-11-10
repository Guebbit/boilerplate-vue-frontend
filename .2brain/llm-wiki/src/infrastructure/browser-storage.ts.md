---
source: src/infrastructure/browser-storage.ts
sha256: db07f6961df908ae48b361d949c8b3c15db41fc019df603c89c160c3903280a7
signature: 480438425444ca689b4e94b8137eee6026bfd1ef6144f289f5543bfc6fdea4d8
generated_at: 2026-11-10T03:01:36.800979+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/browser-storage.ts

## Purpose

Central inventory of every cookie and storage key the app leaves in a visitor's browser. It defines the shared types and a typed list of items (name, kind, setter, necessity, optional condition) that the privacy page renders as a table and that the code setting each item imports as its storage-name constant, so the two never drift apart. Wording (purpose, lifetime) lives in translation keys under `browser-storage.rows.<id>` so a shop can edit it at runtime.

## Key elements

- **`BrowserStorageKind`** — union: `'cookie' | 'localStorage' | 'sessionStorage'`.
- **`BrowserStorageSetter`** — union: `'backend' | 'frontend' | 'library'`.
- **`BrowserStorageNecessity`** — union: `'necessary'` (ePrivacy Art. 5(3) exempt) or `'consent'` (exists only after visitor agreement).
- **`BrowserStorageCondition`** — union: `'analytics' | 'faro'`; present only when the item is conditional on a deployment feature.
- **`BrowserStorageItem`** — interface with `id`, `kind`, `setter`, `party` (always `'first'`), `necessity`, and optional `when`.
- **`BROWSER_STORAGE_NAME`** — re-export of `BROWSER_STORAGE_NAMES` from the generated file; the single source for the literal storage name each item uses.
- **`SIX_MONTHS_DAYS`** — `183`; lifetime for remembered consent answers and the guided-tour record.
- **`BROWSER_STORAGE_ITEMS`** — `readonly BrowserStorageItem[]`, built from `BROWSER_STORAGE_DATA`; display order matches the privacy page.
- **`browserStorageFor(conditions)`** — filters `BROWSER_STORAGE_ITEMS` so the page never lists a cookie the current deployment cannot set (respects `when` against the provided `analytics` / `faro` flags).

## Relationships

- **`src/infrastructure/browser-storage.generated.ts`** — sole import source. `BROWSER_STORAGE_NAMES` is re-exported as `BROWSER_STORAGE_NAME`; `BROWSER_STORAGE_DATA` is mapped into `BROWSER_STORAGE_ITEMS`. The generated file is produced from the backend's synced cookie list and a YAML rules file, so this file is a thin typing/presentation layer over it.

## Notes

- `id` is `keyof typeof BROWSER_STORAGE_NAME`, so adding a new entry to the generated file without updating the type will fail at compile time.
- Two entries in the name map are **prefixes** (`checkoutDraft` + user id); code that sets them must concatenate the dynamic suffix.
- `party` is hardcoded to `'first'` for every item. Vendor-widget cookies are intentionally excluded and named on the privacy page prose instead.
- Legal semantics of the two `necessity` values are defined in `docs/theory/data-protection.md`, not in this file.
