---
source: tests/unit/infrastructure/session.spec.ts
sha256: 2238959320be965b63fcf8cc9f56326fa8896b2a8f828d32072b685b73b1b468
signature: 7e13f656a489714d68d219f0f9300f0cb5d763f1150fab694fb8539735c28e12
generated_at: 2026-11-10T08:03:40.536686+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/session.spec.ts

## Purpose

Unit tests for the Pinia session store (`src/infrastructure/session.ts`). The store is exercised for real; only the `@api` network layer is mocked. Covers `setAccessToken` (rememberMe cookie, Secure flag, lifetime), `loadViewer` (projection fields, abilities, checkout), and related cookie/session behaviour. Step-up, verification-mail, and language-preference calls live in sibling spec files.

## Key elements

- **`viewOf(tenant, overrides)`** — Builds a `GET /account` response validated against the Orval contract schema (`contractBody` + `schemas.GetAccountResponse`), wrapping an `anAccount`/`accountView` fixture with the given tenant rules.
- **`vi.mock('@api', …)`** — Replaces the generated API client with five untyped `vi.fn()` stubs (`getAccount`, `getConfig`, `refreshToken`, `logout`, `logoutAll`) plus a real `touchSession` that resolves immediately. Deliberately untyped so fixtures can return partial shapes the generated envelope types would reject.
- **`signedIn()`** — Returns a store instance with both a token and a viewer set (the two conditions `isAuth` requires).
- **`cookieJar()`** — Reads `document.cookie` (real in jsdom) into a `{ name: value }` map for assertions.
- **`describe('setAccessToken …')`** — Verifies rememberMe marker write/absence, cookie lifetime (14 days from `lifetimes.lifetimeSeconds.long`), persistence across refresh, and Secure-flag presence/absence per page protocol (via a `Document.prototype.cookie` setter spy that forwards to the native setter).
- **`describe('loadViewer')`** — Verifies `thumbnailUrl` passthrough, `verified` projection from `verifiedAt`, tenant abilities loaded from the same `GET /account` response, `can('checkout', 'Cart')`, and staff `read`/`display` rule semantics.

## Relationships

- **`tests/support/unit/orval-fixture-schema.ts`** — Supplies `contractBody`, which `viewOf` uses to assert fixture payloads conform to the generated Orval schema before handing them to the mock.
- **`tests/support/unit/fixtures.ts`** — Supplies `anAccount` (and `aProblem`, imported though not exercised in the visible portion) used to build account fixture data.
- **`tests/support/unit/account-view.ts`** — Supplies `accountView`, which projects a raw account fixture into the `AccountView` shape the session store expects.
- **`tests/support/unit/config-answer.ts`** — Supplies `configAnswer`, used to shape `getConfig` mock responses for the public config the session reads.

## Notes

- The store is imported via a top-level `await import(...)` **after** `vi.mock` is registered; do not convert to a static import or the mocks will not apply.
- `jsdom` persists `document.cookie` across tests within a file, not per-test. The inner `beforeEach` in the `setAccessToken` block calls `useSessionStore().clearSession()` specifically to avoid cross-test cookie leakage.
- Secure-flag assertions cannot read `document.cookie` directly (jsdom strips `Secure` on an `http:` origin). They spy on `Document.prototype.cookie`'s **setter** and forward to the native setter so the jar remains functional while capturing the raw string.
- `vi.fn()` stubs are intentionally untyped (each `eslint-disable-next-line` is load-bearing); typing them against the full generated envelope shapes would reject the partial fixture objects these tests rely on.
- `touchSession` is **not** stubbed with `vi.fn()`; it returns a resolved promise directly inside the mock factory.
- `resetConfig()` from `@/infrastructure/config.ts` is called in every `beforeEach` to clear module-level config state between tests.
- The file is truncated in the provided content; the staff `read`/`display` `.each` table and any subsequent describe blocks are not visible here.
