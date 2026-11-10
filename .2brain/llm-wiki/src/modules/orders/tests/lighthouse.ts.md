---
source: src/modules/orders/tests/lighthouse.ts
sha256: d90ebea259bd48c11cf9ba49555336254780340fc7c7dec3de10c573cf9e8776
signature: b8b3ef881cd49ccff63e2caf2de5157c82dd0445ec45a97e6dae725d2792cbe1
generated_at: 2026-11-10T05:02:28.107103+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/lighthouse.ts

## Purpose

Declares the Lighthouse test cases that the orders module contributes to the shared Lighthouse suite. Each case maps a named scenario to a route and persona so the Lighthouse runner can execute it. The file exists so the orders module can plug its specific cases into the centralized `tests/support/lighthouse/case.ts` framework without hard-coding them elsewhere.

## Key elements

- **`lighthouseCases: readonly LighthouseCase[]`** — The sole export. An array of `LighthouseCase` objects that this module registers. Currently contains one case:
  - `name: 'orders/sales'`, `route: '/en/sales/orders'`, `persona: 'manager'`

## Relationships

- **`tests/support/lighthouse/case.ts`** — Provides the `LighthouseCase` type that shapes each entry in `lighthouseCases`. This file only consumes the type (no runtime import); the actual Lighthouse runner collects all modules' `lighthouseCases` exports and executes them.

## Notes

- The file is typed as a `@module` (no top-level `export` other than the cases array), meaning it is imported solely for its `lighthouseCases` binding.
- The doc comment references `docs/tools/lighthouse.md#cases-live-with-modules` for context on how these per-module cases relate to the broader Lighthouse case system.
- The single case describes a "staff data table" scenario (per the module doc comment), accessible by a `manager` persona at the sales orders route.
