---
source: tests/support/e2e/images.ts
sha256: a67bd1ca130961334645132f9fa40137ab92ac0a2a54e8a6e2802f4af6f05b74
generated_at: 2026-10-17T02:25:41.713651+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/images.ts

## Purpose

Shared test helpers for specs that upload an image. Because a RabbitMQ broker computes the image digest **after** the HTTP response (off the request path), neither application pushes the final `src` to the browser. The only way a spec can observe the post-digest value is to reload the page and re-read the attribute, which is exactly what `pollForImageSource` does.

## Key elements

- **`UPLOAD_PATH`** (exported `RegExp`) — Matches the server-assigned path for an uploaded file: `/images/<owner-hex>-<24-hex-hash>.<ext>`, with an optional `http(s)://host` prefix. Owner length is variable (profile-dependent), so it's `[\da-f]+`. Deliberately does **not** match the `seed/` directory (seeded images are not uploads).
- **`pollForImageSource(selector, pattern, deadline?)`** (exported) — Returns a `Cypress.Chainable<string>`. Reads the element's `src`, first asserting it is not the bundled `no-image-placeholder`. If the value already matches `pattern` or the `deadline` has passed, resolves immediately. Otherwise waits 500 ms, reloads the page, and recurses. Defaults `deadline` to 15 s from now.
- **`DIGEST_TIMEOUT_MS`** (module-private, `15_000`) — Upper bound for the poll loop.
- **`DIGEST_POLL_INTERVAL_MS`** (module-private, `500`) — Pause before each reload.

## Relationships

All four graph neighbors are Cypress e2e specs that upload an image and then need to wait for the broker's digest to land in the DOM:

- `tests/e2e/specs/uploads.cy.ts`
- `src/modules/products/tests/e2e/uploads.cy.ts`
- `tests/e2e/specs/journeys/ac14-my-details-and-my-picture.cy.ts`
- `tests/e2e/specs/journeys/cu12-buy-again-catalogue-changed.cy.ts`

Each spec imports `pollForImageSource` (and typically `UPLOAD_PATH`) to poll the uploaded `<img>` until its `src` reflects the final digest.

## Notes

- The `cy.wait` inside the polling loop is intentionally present (with an eslint-disable) because the digest worker is a queue consumer neither app drives; the loop is bounded by `deadline`, not by an assumed fixed duration.
- If the test environment has **no** broker, the first read already matches and `pollForImageSource` returns on the first pass with no reload.
- `UPLOAD_PATH` is a raw `RegExp` (not a compiled `new RegExp` call), so it cannot be mutated by accident, but it also cannot be parameterised—specs that need a different pattern should build their own and pass it as the `pattern` argument.
