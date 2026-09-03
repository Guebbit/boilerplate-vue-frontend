# src/infrastructure/http/envelope.ts

## Purpose

Type-guard helpers that let any call site read a response whether the API wrapped it in a `{ data }` envelope or returned the payload directly. Placed here (transport layer) rather than in a store because the envelope is a property of the wire format, not of any single feature.

## Key elements

- **`isObjectRecord`** (private) — Narrows `unknown` to `Record<string, unknown>`; guards against `null` and non-object types.
- **`isWrappedResponse<T>`** (private) — Predicate: the value is a plain object *and* carries a `data` key. Used to narrow to `{ data?: T }`.
- **`getTokenFromResponse`** (exported) — Returns `string | undefined`. Checks the top level for a bare `token` first (login shape), then falls back to `data.token` (refresh/envelope shape).
- **`getPayloadFromResponse<T>`** (exported) — Generic unwrapper. If the response is wrapped, returns `response.data`; otherwise returns the value itself. Accepts `undefined` input and yields `T | undefined`.

## Relationships

- **`src/infrastructure/http/refresh.ts`** — Consumes these helpers when parsing the refresh-token response, which arrives in the `{ data }` envelope (the doc comment on `getTokenFromResponse` explicitly distinguishes the bare login shape from the wrapped refresh shape).

## Notes

- Order matters in `getTokenFromResponse`: the top-level `token` check runs *before* the envelope check. A response that is both `{ token, data: { token } }` will return the outer token.
- The `eslint-disable` on `isWrappedResponse` suppresses `no-unnecessary-type-parameters`; the generic is intentional so callers can name their payload type in the narrowing.
- `getPayloadFromResponse` does **not** validate that `data` exists at runtime beyond the `'data' in response` check; if `data` is explicitly `null` or `undefined`, the result is `undefined`.
