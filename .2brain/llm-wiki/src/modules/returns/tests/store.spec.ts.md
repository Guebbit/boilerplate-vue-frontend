---
source: src/modules/returns/tests/store.spec.ts
sha256: d213e32a10b81a65ae9806518d985c0ae300bc2a755748ee4fd4218731ed451f
generated_at: 2026-10-17T01:39:00.389184+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/store.spec.ts

## Purpose

Unit tests for the returns Pinia store against a mocked HTTP transport. Verifies what each store action sends (URL, method, body, headers), what it caches, and that a state-mutating call **replaces** the cached record with the server's answer. Request bodies are validated against the OpenAPI contract schemas (`@api/schemas`) so payload drift fails in CI rather than as a 422 in production.

## Key elements

- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a spy that records every request into a module-level `sent[]` array and resolves with a canned response looked up by `METHOD url` key. Responses pass through `parseOrvalFixture`, so the store sees the same envelope-unwrapping as production.
- **`openReturn` tests** — confirm the created return is returned and cached, that a "withdrawal-before-dispatch" return is cached as closed with no lines, and that an `Idempotency-Key` header is present.
- **"read wrapper hands back no response" tests** — confirm `openReturn` resolves `undefined` and `fetchOrderReturns` resolves `[]` when the transport yields nothing, with no cache mutation.
- **Staff moves (`approve`, `decline`, `receive`)** — verify the cached record is *replaced* (not merged), that `decline` sends `{ reason }`, and that `receive` sends `{ handlingDeduction }` plus an `Idempotency-Key`.
- **`fetchOrderReturns` / `fetchReturnOptions`** — verify query params (`orderId`), that items/options are returned and (for the list) cached, and that an undefined transport result yields `undefined`.
- **`contractRequest(schemas.X, body)`** — asserts the outgoing body matches the schema-parsed shape, not just a hard-coded object literal.

## Relationships

- **`src/modules/returns/store.ts`** — the system under test; every `describe` block calls one of its actions.
- **`tests/support/unit/fixtures.ts`** — supplies the `aReturn` factory (optionally overridable) used to build canned server responses.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module top-level to make the path aliases (`@/infrastructure/http`, etc.) resolvable inside Vitest.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wrap a body in the API envelope), `parseOrvalFixture` (unwrap it, as the real transport would), and `contractRequest` (validate a body against a `@api/schemas` parser and return the typed result).

## Notes

- `wireModulesIntoCore()` runs **once at import time**, not inside `beforeEach`; if a new alias is added it must be registered there before the mock factory runs.
- The `responses` map is keyed by string (`"POST /returns"`, `"GET /returns/options"`, etc.). A route added to the store that isn't present in the map will cause `parseOrvalFixture` to receive `undefined`—useful for the "no response" tests but easy to forget when adding new actions.
- The mock's `sent[]` array is cleared in `beforeEach`; assertions that reference `sent[0]` are therefore scoped to the single call made in the immediately preceding `it` block.
- Idempotency assertions only check for the *presence* of a string header value (`expect.any(String)`), not a specific UUID, since the key is generated per-call.
