---
source: tests/unit/infrastructure/browser-storage.spec.ts
sha256: 272712fc5c497aa62c642cd36e6c01d95449e0e828f29b8119685d4037714379
signature: 82963c58c68c66190cbb2b1a3cc338933c2f0c68b24f89d28027d2aa4265ffd0
generated_at: 2026-11-10T07:54:44.647467+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/browser-storage.spec.ts

## Purpose

Unit tests (Vitest) for the `@/infrastructure/browser-storage` module. Verifies that the browser-storage inventory is complete (one row per named item, all backend-declared cookies present, all three storage kinds covered), that every row has a translated purpose and lifetime in English and Italian, and that `browserStorageFor` correctly includes or excludes rows based on which optional features (analytics, Faro) the shop has configured.

## Key elements

- **`describe('the inventory')`** — four tests asserting structural invariants of `BROWSER_STORAGE_ITEMS` and `BROWSER_STORAGE_NAME`:
  - Row ids and `BROWSER_STORAGE_NAME` keys are in 1-to-1 correspondence (no duplicates, no gaps).
  - Every cookie id declared in `contracts/cookies.yaml` appears in `BROWSER_STORAGE_NAME` under the exact name the backend uses (guards against an empty/missing YAML making the check vacuous).
  - The `kind` field covers exactly `{cookie, localStorage, sessionStorage}`.
  - Each row has a non-falsy `purpose` and `lifetime` in both `en` and `it` locale dictionaries.
- **`names(conditions)` (local helper)** — shorthand that calls `browserStorageFor({analytics, faro})` and returns just the `id` array, used to assert inclusion/exclusion.
- **`describe('browserStorageFor')`** — three tests covering the conditional logic:
  - With no analytics: `analyticsConsent`, `umamiDisabled`, `faroNavigation` are absent; `session` is present.
  - `faroNavigation` appears **only** when `faro: true`, independent of the analytics flag.
  - Among all items, exactly `faroNavigation` carries `necessity === 'consent'`; every other row is exempt.

## Relationships

No graph neighbors are tracked for this file.

## Notes

- The cookies cross-check depends on a **filesystem read** of `contracts/cookies.yaml` at test time; the file must exist and contain at least one cookie entry for the assertion to be meaningful (the explicit `toBeGreaterThan(0)` guard enforces this).
- The test assumes a fixed locale key shape: `dictionary['browser-storage'].rows[id]` with `purpose` and `lifetime` sub-keys. Adding a new row without a corresponding locale entry will fail the localization test.
- The `necessity === 'consent'` assertion is currently pinned to exactly `['faroNavigation']`; adding any new consent-gated item will break it.
