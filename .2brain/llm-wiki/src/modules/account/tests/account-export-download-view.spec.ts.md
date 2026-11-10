---
source: src/modules/account/tests/account-export-download-view.spec.ts
sha256: 8bfcd6bbb95d2f98ce4dad19e884c6bedcd67723041bbee0bc97dffa42403fea
signature: 3f51037a3a43fe387739e2ba1971b25326a702a7a91d8520237034e34989c6ac
generated_at: 2026-11-10T03:28:51.833229+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/account-export-download-view.spec.ts

## Purpose

Vitest spec for the `AccountExportDownload.vue` page (the target of the "your data export is ready" email link). Verifies that the page displays the correct status state (ready, building, failed, none), only initiates a download on explicit user click, saves the file under the server-supplied name, distinguishes a 404 (expired) from a 500 (server error), and disables the button while a download is in flight.

## Key elements

- **`mountPage()`** – Mounts `AccountExportDownload` with router, Vuetify, and i18n plugins; spies on `useAccountProfileStore().downloadAccountExport` *before* mount (the view destructures it at setup) and returns the wrapper plus the spy.
- **`statusIs(body?)`** – Registers an MSW handler for `GET */account/export`, returning either the given export object or a 404 problem+json.
- **`READY`** – Fixture for a ready export (id, `status: 'ready'`, `actions`, `createdAt`, `expiresAt`).
- **`EXPORT_FILE`** – A `File` instance representing the API's download payload, used to assert `downloadBlob` receives the server's filename.
- **`router`** – Real app router (`createMemoryHistory`) with `collectModuleRoutes(enabledModules)` as children, so the page reads its export id off the route path.
- **`vi.mock('@guebbit/js-toolkit')`** – Replaces `downloadBlob` with a spy (jsdom cannot perform a real throwaway-link save).
- **`describe('AccountExportDownload status')`** – Four cases: ready (enabled button + "kept until"), building (disabled), failed (disabled), none/404 (disabled + "kept for a few days" hint appears only after async load).
- **`describe('AccountExportDownload')`** – Six cases covering: no fetch on arrival, successful download (filename preserved), 404 error (hint shown), 500 error (hint *not* shown), empty-body response (no save, no error), and button disabled during in-flight download (double-click guard).

## Relationships

- **`src/modules/account/views/AccountExportDownload.vue`** – The component under test; all assertions target its DOM via `data-test` attributes.
- **`src/modules/account/stores/profile.ts`** – Provides `useAccountProfileStore`; its `downloadAccountExport` action is spied to inject mock resolutions/rejections and to assert call counts and arguments.
- **`tests/support/unit/msw-server.ts`** – Exports the shared MSW `server` instance; `statusIs()` registers per-test request handlers on it.
- **`tests/support/unit/fixtures.ts`** – Exports `aProblem()`, used to build RFC-7807 problem+json error objects for 404 and 500 rejection cases.
- **`tests/support/unit/wire-modules.ts`** – Exports `wireModulesIntoCore()`, called once at module load to register account-module routes and stores so the real router can resolve them.

## Notes

- The spy must be created **before** `mount()` because the view destructures `downloadAccountExport` during `setup()`; a post-mount spy would not intercept the reference the view captured.
- The 404-vs-500 distinction is an intentional product rule: only a 404 triggers the "Request a new one from your profile" hint; a 500 (or any other error) shows the raw message without that guidance.
- `downloadBlob` is mocked, not stubbed with a return value—the test only inspects its arguments to confirm the file and filename pass through unchanged.
- `wireModulesIntoCore()` is a side-effect import (no `await`); it must run before the router is constructed at module scope.
