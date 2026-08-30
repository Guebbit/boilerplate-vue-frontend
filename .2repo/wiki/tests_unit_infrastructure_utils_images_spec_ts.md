# tests/unit/infrastructure/utils/images.spec.ts

## Purpose

Unit tests for `src/infrastructure/utils/images.ts`, covering the three image-URL helpers. The core concern is `resolveImageUrl`: it must prefix API-relative paths with the API origin (read from the axios instance) while leaving already-absolute URLs untouched. The file also pins down the "no thumbnail param set" and "thumbnail param set" contracts for `thumbnailImageUrl`, and the fixed path returned by `placeholderImageUrl`.

## Key elements

- **`resolveImageUrl` tests** — verifies origin-prefixing, single-slash joining (avoiding `//` which browsers read as a protocol-relative host), pass-through of `https://`, `http://`, `//`, `data:`, and `blob:` URLs, `undefined` for nullish/empty input, and identity passthrough when `baseURL` is `''` (same-origin deployment).
- **`thumbnailImageUrl` tests** — asserts `undefined` when `VITE_IMAGE_THUMBNAIL_PARAM` is unset (the "no sized variant" contract `LazyImage` relies on); when the param *is* set, appends `?w=<px>` or `&w=<px>` to the resolved URL; returns `undefined` for a nullish source.
- **`placeholderImageUrl` test** — asserts the constant return value `/images/no-image-placeholder.svg`.
- **`withThumbnails()` helper** — stubs the env var, calls `vi.resetModules()`, dynamically re-imports both the http client and the images module, re-applies the test `baseURL` to the fresh axios instance, and returns the freshly evaluated images module. Required because the thumbnail param is read at module-load time.
- **`beforeEach` / `afterEach`** — sets and restores `instance.defaults.baseURL` on the *original* axios instance so the static-import tests resolve against a known origin.

## Relationships

No graph-neighbor files are recorded for this spec. It imports directly from two source modules:

- `@/infrastructure/utils/images` — the unit under test.
- `@/infrastructure/http/client` — imported for the shared axios `instance` whose `defaults.baseURL` the tests mutate.

## Notes

- The thumbnail tests **cannot** use a static import of the images module: `VITE_IMAGE_THUMBNAIL_PARAM` is read at module-evaluation time. `withThumbnails()` re-evaluates the module after `vi.stubEnv`, which also re-evaluates the axios client—hence the extra `freshInstance.defaults.baseURL = …` line. Omitting it makes the suite silently depend on whatever `.env` is present.
- The leading-`//` assertion is not cosmetic: a browser treats `//host` as a protocol-relative URL, so the single-slash join in `resolveImageUrl` is load-bearing, not stylistic.
- `baseURL` is set on the axios instance rather than via an env stub because that is the actual read path in production code, including the e2e runner's runtime override.
