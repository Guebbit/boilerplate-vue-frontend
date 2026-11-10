---
source: tests/support/unit/wire-modules.ts
sha256: c7500571fc429abaf7da13b60a92851955cffe55797c33c7636f114a7d23ecb0
signature: e787ea4e171d2fdf9ef0383b7ae581010f66e231758c50a6bd75594c1113998a
generated_at: 2026-11-10T07:43:35.850242+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/wire-modules.ts

## Purpose

Provides a single helper (`wireModulesIntoCore`) that unit specs call at module scope to register every enabled module's locale dictionaries, notices, and (conditionally) response-schema rows into the core runtime — replicating what `src/main.ts` does at boot. Without this step, specs would silently run with missing vocabulary and no contract validation, passing tests that should fail.

## Key elements

- **`wireModulesIntoCore(): void`** — The sole export. Synchronously calls `registerLocaleContributors` and `registerNotices` with values collected from `enabledModules`. If `shouldValidateResponses()` is true, fire-and-forgets `loadResponseSchemas(...)`; on rejection it rethrows to surface an unhandled rejection (failing the Vitest run rather than silently skipping validation).

## Relationships

- **14 account spec files** (`account-export-download-view.spec.ts`, `account-restore-challenge-view.spec.ts`, `address-form-dialog.spec.ts`, `address-picker.spec.ts`, `addresses.spec.ts`, `auth-login-mfa.spec.ts`, `auth-login-restore.spec.ts`, `auth-session.spec.ts`, `auth-signup.spec.ts`, `confirm-once.spec.ts`, `delete-account-panel.spec.ts`, `link-token-confirm-card.spec.ts`, `login-view-i18n.spec.ts`, `oauth-buttons.spec.ts`) — These are consumers that import and call `wireModulesIntoCore()` at module scope before their test suite runs. The file's own comment notes ~174 specs do this overall; these 14 are the account-module subset that appear in this file's dependency graph.
- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor but not directly imported or referenced in this file's visible content; no interaction is observable here.

## Notes

- **Not compatible with `vi.resetModules()`.** A spec that resets modules gets a different module instance than the one this file imported, so wiring must be redone inline against the freshly imported copies. `tests/unit/infrastructure/http/http-validate-responses.spec.ts` is the cited example.
- **`(): void` is intentional.** The function is synchronous at the call site because `shouldValidateResponses()` returns false under Vitest's default mode, so the async schema load is almost never triggered. Making it async would force every call site to `await` for a no-op.
- **Specs that stub `VITE_VALIDATE_RESPONSES=true`** must call `loadResponseSchemas` themselves before their first request, since this helper's fire-and-forget `.catch` handler cannot be awaited.
