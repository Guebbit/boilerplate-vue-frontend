---
source: src/modules/account/tests/profile-export-data.spec.ts
sha256: 8b57d9a44e4c2fb05d4b2ec184e008c8db80cbb568279b1c1e633646a103ed1b
signature: 8a4c4e7048c58d510385b13395f5d212d1a570cb9a9844b4902ab9874836729c
generated_at: 2026-11-10T03:39:21.590852+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-export-data.spec.ts

## Purpose

Vitest spec for the `ProfileExportData.vue` component. Verifies that the card reads export status on load (via MSW), displays the correct state (none / building / ready / failed), triggers `requestAccountExport` on click, and surfaces errors in place without downloading anything itself.

## Key elements

- **`mountComponent()`** – Mounts `ProfileExportData` with Vuetify + i18n plugins; spies on `useAccountProfileStore().requestAccountExport` *before* mount (the component destructures it during `setup`). Returns `{ wrapper, request }`.
- **`EXPORT`** – Minimal export object (`id`, `createdAt`, `actions`) used as the base shape for status fixtures.
- **`statusIs(body?)`** – Registers an MSW route on `*/account/export`; returns the given body as JSON or a 404 `application/problem+json` when `body` is `undefined`.
- **`press(wrapper)`** – Clicks `[data-test=profile-export-data] button` and flushes promises; returns a promise for chaining.
- **`beforeEach`** – Resets Pinia, installs a default (no-export) MSW handler, loads the `en` locale.
- **7 test cases** covering: blank state with no export, "building" status, "ready until" expiry text, "failed" status, successful request (link-will-be-mailed message), request refusal (error shown, no "requested" state), and refusal after a prior successful request (error shown *and* prior "requested" state retained).

## Relationships

- **`ProfileExportData.vue`** – The component under test; the spec drives its rendering and button interaction.
- **`profile.ts` (store)** – `useAccountProfileStore` is imported; `requestAccountExport` is the sole store method spied and asserted against.
- **`msw-server.ts`** – Provides the shared `server` instance used to intercept the `*/account/export` GET.
- **`fixtures.ts`** – Supplies `aProblem(status, errors[])` to build `application/problem+json` bodies for 404 and 500 responses.
- **`wire-modules.ts`** – `wireModulesIntoCore()` is called once at module top-level to patch Vite aliases / module graph before any import resolves.

## Notes

- The spy must be attached **before** `mount()` because the component destructures the store action during `setup`; attaching it later would miss the binding.
- `wireModulesIntoCore()` runs at module scope (not in `beforeEach`), so it executes exactly once per test-file load.
- The component is expected to **never** initiate a download; it only calls the store method and renders status text.
- Error assertions check for the human-readable `message` from the problem+json body, not the HTTP status code.
- All element queries use `data-test` attributes rather than structural selectors.
