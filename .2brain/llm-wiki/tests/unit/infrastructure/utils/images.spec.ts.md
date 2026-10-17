---
source: tests/unit/infrastructure/utils/images.spec.ts
sha256: 15cffa7dd398dcc548d8f4479302dcddc21e2b394ec176acf3b034354aa5eb29
generated_at: 2026-10-17T02:39:21.957475+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/images.spec.ts

## Purpose

Unit tests for `src/infrastructure/utils/images.ts`, verifying that `resolveImageUrl` correctly prefixes API-relative image paths with the API origin (read from the live axios instance) while leaving already-fetchable URLs untouched, and that `placeholderImageUrl` returns the bundled fallback asset path. The tests exist because the original bug — rendering nothing on cross-origin deployments — was invisible to e2e assertions that only checked the `src` attribute string.

## Key elements

- **`describe('resolveImageUrl')`** — six cases covering:
  - Prefixing a server-relative path (`/images/…`) with the API origin.
  - Single-slash joining regardless of trailing slash on baseURL or leading slash on the path (prevents accidental `//` protocol-relative URLs).
  - Pass-through of absolute URLs, protocol-relative URLs, `data:` URIs, and `blob:` URIs (parameterised via `it.each`).
  - Returning `undefined` for `undefined`, `null`, and `''` (the signal that selects the placeholder).
  - Returning a rooted path when `baseURL` is empty (same-origin deployment).
- **`describe('placeholderImageUrl')`** — asserts the static return value `/images/no-image-placeholder.svg`.
- **`beforeEach` / `afterEach`** — sets `instance.defaults.baseURL` to a fixed test origin and restores the original after each case.

## Relationships

None. The test file imports from `@/infrastructure/http/client` (for the axios `instance`) and `@/infrastructure/utils/images` (the two functions under test), but the dependency graph reports no other graph neighbors.

## Notes

- `baseURL` is set directly on the shared axios `instance` rather than stubbed through environment variables, because that is where the production code reads it and where the e2e runner applies its runtime override.
- The "join exactly one slash" case matters beyond cosmetics: a browser interprets a leading `//` after `https:` as a new host, which silently breaks the request.
- `thumbnailUrl` is not tested separately; it routes through the same `resolveImageUrl` path on the backend, so no distinct leaf existed to test.
