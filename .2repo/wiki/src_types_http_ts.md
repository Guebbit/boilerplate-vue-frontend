# src/types/http.ts

## Purpose

Defines the TypeScript interfaces for the API's HTTP response envelope. It establishes a discriminated-union pattern (`success: boolean`) so callers can narrow a generic response into a success or reject shape at compile time, eliminating the need to branch on raw status codes.

## Key elements

- **`ResponseNeutral`** — Base interface with the three fields every envelope carries: `success` (discriminant), `status`, `message`.
- **`ResponseSuccess<T>`** — Extends `ResponseNeutral`; adds optional `data?: T` and pins `errors` to `never`. The generic `T` lets each endpoint specify its payload type.
- **`ResponseReject`** — Extends `ResponseNeutral`; pins `data` to `never` and requires `errors: ErrorItem[]` (structured error list). Also carries optional `requestId` / `traceId` for backend correlation.
- **`ErrorItem`** — Imported type from `@api`; the element type of the `errors` array (referenced as the structured error shape defined in the OpenAPI spec).

## Relationships

- **`src/types/index.ts`** — Barrel file that re-exports the interfaces defined here (`ResponseNeutral`, `ResponseSuccess`, `ResponseReject`) so consumers can import them via the `@types` path without specifying the sub-module.
- **`@api`** (external) — Source of the `ErrorItem` type used by `ResponseReject.errors`.

## Notes

- `ResponseSuccess` and `ResponseReject` are mutually exclusive via the `never` assignments on `errors` / `data`. Use a `success` check (or `type` guard) to discriminate; do **not** rely on `status` alone.
- `ResponseSuccess<T>.data` is **optional** — a successful endpoint may return no payload. Guard against `undefined` even in the success branch.
- `message` semantics differ by outcome: human-readable on success, a technical error name/code on reject (see inline comments).
- `requestId` / `traceId` exist only on `ResponseReject`; they are backend correlation IDs for debugging, not part of the success contract.
