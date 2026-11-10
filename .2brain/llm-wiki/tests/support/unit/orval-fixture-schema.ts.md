---
source: tests/support/unit/orval-fixture-schema.ts
sha256: c25e694ccfa2b1c59e8372f2dbb8a6c6cb42c36a05595750c0a5bffd189da389
signature: 72f016c0b63daad7f83e89796c49ce796f7107cd5d8f275aaf500a5ea70a362d
generated_at: 2026-11-10T07:42:34.022840+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/orval-fixture-schema.ts

## Purpose

Validates hand-typed test fixtures against the real contract schemas (Zod) before a mock resolves them, closing the gap where a spec that mocks `orvalMutator` directly bypasses `orvalMutator`'s own response validation. A fixture that silently drifts from the generated contract is caught here at test time instead of passing forever.

## Key elements

- **`parseOrvalFixture(method, url, data)`** — Resolves the route's response schema via `resolveResponseSchema`, `safeParse`s the fixture against it, and returns the *original* `data` (or throws `ZodError`). Unmapped routes pass data through unchanged.
- **`contractResponse(schema, data?)`** — Same proof for specs that mock a generated `@api` function (no URL to look up). Caller names the `<Operation>Response` schema explicitly.
- **`contractBody<TBody>(schema, data?)`** — Typed wrapper around `contractResponse` that casts the result to the caller's named client-answer type (`TBody`), so a spec can hand it straight to a mocked client function.
- **`contractRequest(schema, data)`** — Request-body counterpart: validates what `orvalMutator` was *called with* against the operation's `<Operation>Body` schema, catching drift in outbound payloads.

## Relationships

- **Imports** `resolveResponseSchema` from `@/infrastructure/http/response-schema-map` — the single route-table lookup shared with production.
- **Imports** `ZodType` (type-only) from `zod`.
- **Consumed by** every spec under `src/modules/account/tests/` (addresses, auth-login-mfa, auth-login-restore, auth-session, auth-signup, oauth-buttons, oauth-continue, oauth-links-store, oauth, password-breach-hint, profile-account-consent, profile-addresses-default, profile-addresses-view, profile-avatar, profile-guest-consent-sync). Those specs call the four exports to prove their canned fixtures match the contract before the mock resolves.

## Notes

- All four exports use `safeParse` and return the **original** `data`, never Zod's parsed output. This is deliberate: it prevents `.default()` fields from being silently filled in, so a fixture that omits an optional-with-default field resolves exactly as the test author wrote it — matching what a real backend that omits it would deliver.
- An unrouteable `(method, url)` pair in `parseOrvalFixture` is a pass-through, not a failure; the "not fatal, just unmapped" rule matches `resolveResponseSchema`'s own contract.
- `contractBody` carries an `eslint-disable` for `@typescript-eslint/no-unnecessary-type-parameters`; the generic is the caller's claim about which generated answer the fixture stands in for, so the suppression is intentional.
- The file is `@module` — no default export, no side effects on import.
- Fork of BE `tests/support/body-of.ts`; intentionally not kept in step with that file.
