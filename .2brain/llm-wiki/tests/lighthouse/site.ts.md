---
source: tests/lighthouse/site.ts
sha256: ea4608c13d3468949981ab90a5b5311ac396715536c59101fab0f0857a4a18f8
signature: 5487b7bf19e1b15724bc4a50ecfd2cac2165a3d96861dea0cac9d670d8edc949
generated_at: 2026-11-10T07:25:43.789991+00:00
model: ollama:qwen3.8:27b
---

# tests/lighthouse/site.ts

## Purpose

Defines the Lighthouse audit cases and exception set for the site shell (the public landing page at `/en`). These cases are module-agnostic — they cover the shell itself rather than any specific feature module.

## Key elements

- **`siteCases`** (`readonly LighthouseCase[]`) — The list of routes to audit for the shell. Currently contains a single case, `shell/home`, targeting `/en` with `seo: true`.
- **`SITE_EXCEPTIONS`** (`Readonly<Record<string, string>>`) — Maps audit IDs to a human-readable reason they are suppressed. Empty at present; any entry left stale will fail the run.

## Relationships

- **`tests/support/lighthouse/case.ts`** — Source of the `LighthouseCase` type that shapes each entry in `siteCases`.
- **`scripts/lighthouse/run.ts`** — Consumes `siteCases` and `SITE_EXCEPTIONS` to drive the actual Lighthouse execution for the shell.

## Notes

- The file deliberately holds cases that "belong to no module." Per the project convention (see `docs/tools/lighthouse.md#cases-live-with-modules`), module-specific cases live next to their module instead.
- `SITE_EXCEPTIONS` is intentionally empty. Adding an entry is expected to be temporary; the doc comment warns that a stale exception will fail the CI run, so entries must be removed when their underlying cause is fixed.
