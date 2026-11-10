---
source: src/modules/cart/tests/lighthouse.ts
sha256: 16e8b04530bb28e2b7fa4f083e42f9f5aad9ee3c77792e6c2c84506141500808
signature: 6c393814f62d44a4ac1b0c19f8ce43a5770121dedf2ec9aa10ccebcf87717cb8
generated_at: 2026-11-10T04:07:37.027146+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/lighthouse.ts

## Purpose

Declares the Lighthouse audit cases for the cart module. Two scenarios are defined — a guest cart and a signed-in checkout — each prepared by adding a single rich product to the cart. Neither case is crawled, so no SEO audit runs on them.

## Key elements

- **`addRichProduct(page, context)`** — Internal helper. Navigates to the rich product page, waits for the `[data-test=add-to-cart]` button, clicks it, then waits for network idle. Used as the `prepare` step for both cases.
- **`lighthouseCases`** (exported, `readonly LighthouseCase[]`) — The array of two case objects this module contributes:
  - `cart/guest` — route `/en/cart`, no persona (anonymous shopper).
  - `cart/checkout` — same route, `persona: 'user'` (signed-in shopper).

## Relationships

- **`tests/support/lighthouse/case.ts`** — Supplies the `LighthouseCase` interface (defining `name`, `route`, `persona`, `prepare`) and the `PrepareContext` type (provides `origin` and seeded `subjects` row IDs). This file conforms to those contracts to plug into the shared Lighthouse runner.

## Notes

- `waitForNetworkIdle` uses a short `idleTime` (500 ms) with a 5 s `timeout`. The `TimeoutError` is deliberately swallowed because signed-in pages poll (notifications, stock) and may never reach true silence; any *other* error still propagates.
- The file is marked `@module` — it has no side effects beyond exporting the cases array.
- Both cases share the identical `prepare` function; the only difference is the `persona` field, which the runner interprets to switch authentication state.
