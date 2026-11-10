---
source: src/modules/products/tests/lighthouse.ts
sha256: dd6dea3a80837b83719c9a470bad5fe89803a9979df24d663e5791929b13d124
signature: b8b3ef881cd49ccff63e2caf2de5157c82dd0445ec45a97e6dae725d2792cbe1
generated_at: 2026-11-10T05:24:27.807631+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/lighthouse.ts

## Purpose

Declares the Lighthouse SEO/performance test cases contributed by the products module — the public catalogue list page and a public product detail page. These are the routes that must be crawlable and pass Lighthouse audits in CI or local runs.

## Key elements

- **`lighthouseCases`** (`readonly LighthouseCase[]`) — The exported array of cases for this module:
  - `products/catalogue` → `/en/products`
  - `products/detail` → `/en/products/{subject:product.rich}` (dynamic route, parameterized by product identity)
  - Both are flagged `seo: true`, indicating they are public and expected to be indexable.
- **`LighthouseCase`** (imported type) — The shape each entry must satisfy, defined in the shared test-support module.

## Relationships

- **`tests/support/lighthouse/case.ts`** — Provides the `LighthouseCase` type that structures each entry in `lighthouseCases`. This file is a *consumer* of that type; no runtime coupling beyond the type import.

## Notes

- The route `{subject:product.rich}` is a parameterized pattern, not a literal path. Tooling that executes these cases must resolve the placeholder to a concrete product before hitting the page.
- Execution procedure lives in `docs/tools/lighthouse.md#cases-live-with-modules`; this file only *declares* cases and contains no run logic.
- The array is typed `readonly` — treat it as a constant catalog, not a mutable list.
