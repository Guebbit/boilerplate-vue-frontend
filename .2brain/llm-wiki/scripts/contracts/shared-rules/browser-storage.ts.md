---
source: scripts/contracts/shared-rules/browser-storage.ts
sha256: 9e0822c4f03265ad16b19fdc7ef5b9899a7c289f37a14b9073617ce46b8761f4
signature: 469e5d2e063e8ac47b5a03ac0467202c44aba36638b4ff088b535e08c250b80e
generated_at: 2026-11-10T02:26:27.992448+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/shared-rules/browser-storage.ts

## Purpose

Pure build-time function that merges two sources of browser-storage data—backend cookies synced as `contracts/cookies.yaml` and this repo's own `shared/rules/browser-storage.yaml`—into a single, display-ordered inventory document. The `order` array is the single source of display ordering, so the build fails if a newly added cookie is not given a place. No filesystem access, making every validation path unit-testable.

## Key elements

- **`InventoryRow`** (internal interface) — shape of one merged row: `id`, `name`, `setter`, `kind`, `necessity`, optional `when` guard.
- **`BrowserStorageDocument`** (exported interface) — the output shape: `items` (rows in display order) and `names` (id → stored-name map).
- **`repeated`** (internal helper) — returns ids that appear more than once in a list.
- **`buildBrowserStorage`** (exported function) — takes `BrowserStorageRules` and `SyncedCookies`, returns a `BrowserStorageDocument`. Validates before returning:
  - No id exists in both the backend cookies and the repo's own rows.
  - `own.order` contains no duplicate ids.
  - Every row's id appears in `own.order` (no "missing" rows).
  - Every id in `own.order` has a corresponding row (no "unknown" entries).
  - No two rows share the same stored `name`.

  Throws a descriptive `Error` on any violation.

## Relationships

- **`scripts/contracts/shared-rules/rules.ts`** — provides the `BrowserStorageRules` and `SyncedCookies` types that this module imports and uses as its input contract.
- **`tests/unit/scripts/contracts/shared-rules.spec.ts`** — unit-tests every validation path of `buildBrowserStorage` (the module docblock explicitly notes the absence of filesystem calls so a test can "walk every refusal").

## Notes

- The `order` array in the YAML is the **only** place display order lives; it is not derived from insertion order or alphabetisation.
- Validation errors are thrown eagerly (not collected into a list), so the first violation is the one reported.
- `setter` values are the closed union `'backend' | 'frontend' | 'library'`; `kind` is `'cookie' | 'localStorage' | 'sessionStorage'`; `necessity` is `'necessary' | 'consent'`.
- The `when` field (optional) gates a row behind a feature flag (`'analytics'` or `'faro'`) but is carried through as-is; this module does not evaluate the gate.
