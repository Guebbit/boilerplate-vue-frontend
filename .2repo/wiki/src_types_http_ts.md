# src/types/http.ts

## Purpose

Defines the TypeScript interfaces for the API's HTTP response envelope. Every response returned by the API conforms to one of these shapes, allowing callers to discriminate success vs. rejection via the `success` flag rather than inspecting status codes at runtime.

## Key elements

- **`ResponseNeutral`** — Base interface with the three fields every envelope carries: `success: boolean`, `status: number`, `message: string`. Acts as the discriminant anchor.
- **`ResponseSuccess<T>`** — Extends `ResponseNeutral`. Adds an optional generic payload `data?: T` and pins `errors` to `never`, making it type-safe to assert no error array is present on success.
- **`ResponseReject`** — Extends `ResponseNeutral`. Pins `data` to `never`, requires `errors: string[]` (UI-friendly messages), and includes optional `requestId` / `traceId` for backend correlation and debugging.

## Relationships

- **`src/types/index.ts`** — Barrel file that re-exports the interfaces defined here, making them importable from the project-level types entry point.
- **`src/infrastructure/http/index.ts`** — The HTTP client layer that consumes these interfaces to type its returned responses (e.g., `Promise<ResponseSuccess<T>>` or `Promise<ResponseReject>`).

## Notes

- Discrimination is done via the `success` boolean, not via a string union. Callers should use a type guard or `if (resp.success)` to narrow.
- `ResponseReject.message` is intended to carry a *technical* error name/code (per the inline comment), while `ResponseSuccess.message` is expected to be `"ok"`. The `errors: string[]` array on rejects holds the *UI-friendly* copy.
- `requestId` and `traceId` are optional on rejects; they may be absent on older or simpler endpoints.
