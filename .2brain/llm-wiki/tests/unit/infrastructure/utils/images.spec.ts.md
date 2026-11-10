---
source: tests/unit/infrastructure/utils/images.spec.ts
sha256: 15cffa7dd398dcc548d8f4479302dcddc21e2b394ec176acf3b034354aa5eb29
signature: 15cffa7dd398dcc548d8f4479302dcddc21e2b394ec176acf3b034354aa5eb29
generated_at: 2026-11-10T08:06:07.217828+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/images.spec.ts

## Purpose

Unit tests for `resolveImageUrl` and `placeholderImageUrl` in `@/infrastructure/utils/images`. The critical behaviour under test is that a server-relative path returned by the API (e.g. `/images/<hash>.png`) is prefixed with the API origin so it renders when the frontend and API live on different origins. The file also pins down which input shapes must pass through untouched and which degenerate inputs yield `undefined` (triggering the placeholder).

## Key elements

- **`resolveImageUrl` tests** — verify prefixing of relative paths, correct single-slash joining, pass-through of absolute / protocol-relative / `data:` / `blob:` URLs, `undefined` return for `null` / `undefined` / `''`, and the same-origin (empty `baseURL`) case.
- **`placeholderImageUrl` tests** — assert it returns the static bundled path `/images/no-image-placeholder.svg`.
- **`beforeEach` / `afterEach`** — set `instance.defaults.baseURL` to a known test origin before each case and restore the original value after, because the implementation reads the base URL directly off the axios instance.

## Relationships

- Imports `instance` from `@/infrastructure/http/client` to set and restore `defaults.baseURL` around each test case.
- Imports `resolveImageUrl` and `placeholderImageUrl` from `@/infrastructure/utils/images` (the module under test).

No additional graph neighbours are recorded.

## Notes

- The base URL is written directly on the axios instance rather than stubbed via an environment variable, because that is where the production code (and the e2e runner's runtime override) reads it from.
- The double-slash case (`//images/…`) is called out explicitly: a browser interprets a leading `//` in a URL as a *host* component, so getting the slash count wrong is a functional bug, not cosmetic.
- `thumbnailUrl` is not tested separately; the production code routes it through the same `resolveImageUrl` function, so there is no distinct leaf to cover.
