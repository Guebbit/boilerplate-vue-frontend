# src/infrastructure/http/envelope.ts

## Purpose

Provides type-guard helpers to read payloads out of the API's `{ data }` response wrapper. Because some endpoints (e.g. login) return a bare object while others (e.g. refresh, product lists) wrap the same shape in `{ data: … }`, these guards let a single call site handle both forms without the caller branching on the envelope. The module lives in the HTTP infrastructure layer—rather than in a domain store—because the wrapper is a transport concern, not a business concern.

## Key elements

- **`isObjectRecord`** (private) — Type guard narrowing `unknown` to `Record<string, unknown>`; checks non-null object.
- **`isWrappedResponse<T>`** (private) — Type guard that returns `true` when the value is an object carrying a `data` key; narrows to `{ data?: T }`.
- **`getTokenFromResponse`** (exported) — Extracts a string access token from either a bare `{ token }` (login) or a wrapped `{ data: { token } }` (refresh) response; returns `undefined` if no token is present.
- **`getPayloadFromResponse<T>`** (exported) — Generic extractor: if the response is wrapped, returns `response.data`; otherwise returns the value itself as `T`.

## Relationships

- **`src/infrastructure/http/refresh.ts`** — The refresh flow produces a wrapped `{ data: { token } }` response; `getTokenFromResponse` is shaped to read that form (after first checking for the bare-token shape used by login). The refresh module is a primary consumer of the token-reading path.

## Notes

- `getTokenFromResponse` intentionally checks the top-level `token` key **before** the `data.token` path. This ordering matters because login returns an unwrapped `{ token }` while refresh wraps it; the top-level check must win for the login case.
- `isWrappedResponse` carries an `eslint-disable` for `no-unnecessary-type-parameters`. The generic `<T>` is kept deliberately so the predicate narrows to `{ data?: T }` (the caller's payload type) instead of `{ data?: unknown }`.
- All guards are non-mutating and safe to call with `undefined`/`null`—they simply return `false` / `undefined` rather than throwing.
