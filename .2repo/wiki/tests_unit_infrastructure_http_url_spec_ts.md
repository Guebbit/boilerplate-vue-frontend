# tests/unit/infrastructure/http/url.spec.ts

## Purpose

Unit tests for `toPathname`, the URL → pathname normalisation utility in `src/infrastructure/http/url.ts`. The function is critical because its two downstream consumers — the response-schema table's anchored route patterns and `refresh.ts`'s excluded-paths set — both perform exact-string comparisons, so any normalisation gap causes routes to be silently skipped.

## Key elements

- **`describe('toPathname', …)`** — single test block (7 cases) covering every documented normalisation rule:
  - `undefined` → `'/'` (health endpoint fallback)
  - Relative path passthrough (`/products` → `/products`)
  - Absolute URL extraction, both `https` and `http` schemes
  - Query-string removal from relative and absolute URLs
  - Leading-slash insertion when the path lacks one

## Relationships

- **`@/infrastructure/http/url`** (imported): provides the `toPathname` function under test. No other files are referenced in the graph.

## Notes

- All route patterns in the response-schema table are anchored with `^\/`; a path missing its leading slash would match nothing. This is why the `products → /products` case is tested explicitly.
- Query-string stripping matters for paginated endpoints (`/products?page=1`); without it, every paginated request would bypass schema validation.
- No mocks or fixtures are needed — `toPathname` is a pure string function.
