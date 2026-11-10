---
source: src/modules/example/tests/lighthouse.ts
sha256: 8005bf8a0eb39a09fbf546a469dce0707d725e783244f2cf06619d4fb16ef5ed
signature: b8b3ef881cd49ccff63e2caf2de5157c82dd0445ec45a97e6dae725d2792cbe1
generated_at: 2026-11-10T04:26:24.888745+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/lighthouse.ts

## Purpose

Declares the Lighthouse audit case(s) contributed by the `example` module. It exposes a single, read-only route (a published example viewed as a guest) so the shared Lighthouse runner can include it in live-site audits.

## Key elements

- **`lighthouseCases: readonly LighthouseCase[]`** — The sole export. An array with one entry:
  - `name: 'example/published'` — human-readable label used by the Lighthouse tooling.
  - `route: '/en/examples/published/65e1a0000000000000000e04'` — the URL path under audit; the ID is the backend demo scenario's pinned example.

## Relationships

- **`tests/support/lighthouse/case.ts`** — Provides the `LighthouseCase` type (imported as a type-only import). This file conforms its exported array to that shape; no runtime import.

## Notes

- The pinned ID (`65e1a000000000000000000e04`) must remain in sync with the backend demo seed. Changing the seed without updating this route will break the Lighthouse case.
- The array is typed `readonly`; callers must not mutate it.
- See `docs/tools/lighthouse.md#cases-live-with-modules` for how these per-module cases are aggregated by the runner.
