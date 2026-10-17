---
source: tests/unit/infrastructure/http/orval-fixture-schema.ts
sha256: 6da3ac46e35ae280795e106e87d714864c85a5d3026ab61ff77a0ef27eb3c082
generated_at: 2026-10-17T02:36:40.771674+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/http/orval-fixture-schema.ts

## Purpose

Provides shared helpers that validate hand-typed mock fixtures (responses and request bodies) against the same Zod contract schemas production uses, before a test's mock resolves them. This catches fixtures that have silently drifted from the generated API contract—a gap invisible when a spec mocks `orvalMutator` or a generated client function directly, bypassing runtime validation.

## Key elements

- **`orvalEnvelope(data?, status?)`** — Wraps a payload in the `{ success, status, message, data }` success envelope required by the REST schemas. Omits `data` entirely (rather than setting it to `undefined`) for bodyless responses, because the schemas are `zod.strictObject`.
- **`parseOrvalFixture(method, url, data)`** — Looks up the response schema via `resolveResponseSchema` and `safeParse`s the fixture. Returns the **original** `data` unchanged (never Zod's parsed output, so `.default()` fields are not injected). Passes through unmodified if no schema is mapped for the route.
- **`contractResponse(schema, data?)`** — Same validation, but the caller supplies the operation's `<Operation>Response` schema directly (for specs mocking a generated `@api` function where no URL is available). Returns the full envelope.
- **`contractEnvelope<TEnvelope>(schema, data?)`** — Identical to `contractResponse` but cast to the caller-named generated envelope type so it can be passed directly to a mocked client function.
- **`contractRequest(schema, data)`** — Validates a request body (the `config.data` the app sent) against the operation's `<Operation>Body` schema. No envelope wrapping; the body is the payload itself.

## Relationships

- **`src/infrastructure/http/response-schema-map`** — `parseOrvalFixture` imports `resolveResponseSchema` to map `(method, url)` to the correct Zod schema, the same lookup production uses.
- **`src/infrastructure/http/validate.ts`** — `parseOrvalFixture` mirrors `validateResponseAgainstContract`'s "validate-then-discard" semantics (use `safeParse`, return original data).
- **`src/modules/account/tests/*.spec.ts`** (all 15 listed neighbors) — These specs import the helpers above to proof their `orvalMutator` / generated-client mock fixtures against the real contract schemas before asserting on store behavior.

## Notes

- All validators use `safeParse` and return the **original** input, never Zod's parsed result. This is intentional: a `.default()` in the schema (e.g. `Product.requiresShipping`) must not be injected into the fixture, because a real backend response may legitimately omit that field.
- `orvalEnvelope` omits the `data` key for `undefined` rather than emitting `data: undefined`, because `zod.strictObject` rejects undeclared keys regardless of value.
- `contractRequest` is not wrapped in an envelope—request bodies are the raw payload, unlike responses.
- The `// eslint-disable-next-line` on `contractEnvelope` is load-bearing: the generic parameter exists solely as a caller-side type assertion, not as a runtime transformation.
