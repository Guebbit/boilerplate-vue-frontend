# tests/unit/infrastructure/utils/images.spec.ts

## Purpose

Unit tests for the two exports of `src/infrastructure/utils/images.ts`: `resolveImageUrl` and `placeholderImageUrl`. They exist to pin down the prefixing logic that converts API-relative image paths (e.g. `/images/<hash>.png`) into absolute URLs using the axios instance's `baseURL`, and to guarantee that already-fetchable sources (absolute URLs, `data:`/`blob:` URIs) and empty inputs are passed through or rejected unchanged. The tests target a regression where cross-origin deployments rendered blank images because no one asserted that a byte actually arrived—only that the `src` attribute was a string.

## Key elements

- **`resolveImageUrl` tests** — five cases:
  - Prefixes a path with the API origin.
  - Joins exactly one slash regardless of trailing/leading slashes (prevents accidental `//host` protocol-relative reads).
  - Leaves absolute `http(s)://`, protocol-relative `//`, `data:`, and `blob:` sources untouched.
  - Returns `undefined` for `undefined`, `null`, and `''` (the signal the UI uses to select a placeholder).
  - Returns a rooted path (`/images/…`) when `baseURL` is empty (same-origin deployment).
- **`placeholderImageUrl` tests** — asserts it returns the literal same-origin path `/images/no-image-placeholder.svg`.
- **`beforeEach` / `afterEach`** — swaps `instance.defaults.baseURL` to a known test origin and restores the saved original after each test, so no build-time env stubbing is needed.

## Relationships

- **`@/infrastructure/utils/images`** — the module under test; both `resolveImageUrl` and `placeholderImageUrl` are imported and exercised.
- **`@/infrastructure/http/client`** — the live axios `instance` is imported solely to read/write `defaults.baseURL`, mirroring how `resolveImageUrl` obtains the origin at runtime (including e2e runtime overrides invisible to build-time env reads).

## Notes

- Tests mutate the **shared** axios instance's `baseURL` directly rather than mocking env vars; the save/restore in `beforeEach`/`afterEach` is what keeps test isolation intact. Any test file that runs in parallel and also reads `instance.defaults.baseURL` could be affected if this save/restore pattern is skipped.
- The "joins exactly one slash" case is deliberate: a double-slash (`https://api.example.test//images/…`) would be parsed by browsers as a protocol-relative host, silently breaking the request.
- `thumbnailUrl` is tested through the same `resolveImageUrl` path (the backend promotes it to a server-relative path just like `imageUrl`), so there is no separate `thumbnailImageUrl` test leaf.
