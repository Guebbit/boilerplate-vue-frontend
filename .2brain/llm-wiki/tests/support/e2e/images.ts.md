---
source: tests/support/e2e/images.ts
sha256: a67bd1ca130961334645132f9fa40137ab92ac0a2a54e8a6e2802f4af6f05b74
signature: 748287dbfc105284da6473bb14bf6ea9c79df9181fe4132c12fd50f0f05b92e6
generated_at: 2026-11-10T07:30:55.572616+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/images.ts

## Purpose

Shared helper for every e2e spec that uploads an image. Because a RabbitMQ broker runs the image digest asynchronously off the HTTP request, a page's first paint can still show a pre-digest (or placeholder) value. This file provides a reload-and-re-read polling loop (`pollForImageSource`) and a canonical regex (`UPLOAD_PATH`) for recognising a post-digest upload, so specs don't each reimplement the wait.

## Key elements

- **`UPLOAD_PATH`** (exported `RegExp`) – Matches the API's upload path shape: optional `http(s)://host` prefix, then `/images/<owner-hex>-<24-hex-hash>.<ext>` (`png|jpg|jpeg|webp`). Deliberately does **not** match paths under `seed/` (seeded images are not uploads).
- **`pollForImageSource(selector, pattern, deadline?)`** (exported `Cypress.Chainable<string>`) – Reloads the page and re-reads the element's `src` until it matches `pattern` or `deadline` elapses. On each pass it first asserts the `src` is not the bundled `no-image-placeholder`, then either resolves immediately (pattern matched) or waits 500 ms, reloads, and recurses. Defaults to a 15 s deadline.
- **`DIGEST_TIMEOUT_MS`** (module-private, 15 000) – Upper bound on how long a spec will wait for the broker to finish digesting.
- **`DIGEST_POLL_INTERVAL_MS`** (module-private, 500) – Pause between successive reload-and-read cycles.

## Relationships

- **`tests/e2e/specs/uploads.cy.ts`** and **`src/modules/products/tests/e2e/uploads.cy.ts`** – Upload-focused specs that import `UPLOAD_PATH` / `pollForImageSource` to assert the final image after an upload.
- **`tests/e2e/specs/journeys/ac14-my-details-and-my-picture.cy.ts`** – Journey spec that uploads a profile picture and uses this module to wait for the post-digest `src`.
- **`tests/e2e/specs/journeys/cu12-buy-again-catalogue-changed.cy.ts`** – Journey spec that relies on the same polling helper after a catalogue image is uploaded.

## Notes

- The polling strategy is **reload-based**, not XHR-interception: neither front-end app pushes the digest result, so the only reliable signal is a fresh page load.
- A freshly loaded page briefly shows a bundled `no-image-placeholder` image while the record is still arriving; `pollForImageSource` explicitly rejects that value before testing against the caller-supplied pattern.
- The `cy.wait` inside the polling loop carries an `eslint-disable` for `cypress/no-unnecessary-waiting`; the wait is intentional and bounded by `deadline`, not an arbitrary sleep.
- In a single-origin deployment there is no API-host prefix; `UPLOAD_PATH` handles both cases via the optional `(?:https?:\/\/[^/]+)?` group.
