---
source: src/modules/account/tests/profile-export-data.spec.ts
sha256: 9d35c91d6d8922254973e4ea3a5830a3f334c48fc41ff4aea24327743730354e
generated_at: 2026-10-17T00:25:20.911226+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-export-data.spec.ts

## Purpose

Vitest unit test for the `ProfileExportData` component. Verifies that clicking the export button calls `requestAccountExport` (and never performs a download itself), displays a success message about an emailed link, surfaces server errors in place, and clears a prior success when a subsequent attempt fails.

## Key elements

- **`mountComponent()`** — Spies on `useProfileStore().requestAccountExport` *before* mounting (the component destructures it in `setup`), then mounts `ProfileExportData` with Vuetify and i18n plugins. Returns `{ wrapper, request }`.
- **`press(wrapper)`** — Clicks `[data-test=profile-export-data] button` and flushes pending promises so async store calls resolve before assertions.
- **`beforeEach`** — Installs a fresh Pinia instance and loads the `en` locale.
- **`describe('ProfileExportData')`** — Four cases:
  - No side effects or UI feedback before a click.
  - Success path: store resolves → "email you a link" text appears, no error element.
  - Error path: store rejects → error element shows the server's `errors[0].message`, success element absent.
  - Reset on retry: first call succeeds, second rejects → success element is removed.

## Relationships

- **`src/modules/account/components/ProfileExportData.vue`** — The component under test; the only DOM being asserted against.
- **`src/modules/account/stores/profile.ts`** — Source of `requestAccountExport`, spied on to isolate the network layer and mock success/failure.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module scope to stub Vite module-resolution for unit-level tests (e.g., `@/i18n`, `@/ui/vuetify`).

## Notes

- The spy **must** be attached before `mount()` because the component reads the store method reference during `setup`. Replacing the mock after mount would not intercept the call.
- All DOM queries rely on `data-test` attributes rather than CSS classes or text, so the test is resilient to styling changes.
- The test deliberately never asserts on a file download; the component's contract is "request only," and the wiki should treat any download logic as living elsewhere.
