---
source: tests/support/unit/knobs.ts
sha256: 91f109f5d0a86e81f03892708c7f8cd2ac6c34784886c13ba3d68efc4a923a63
signature: c1a8fa5c6fc5e069df5f5cc6cca3843d6ff6dfe33c1dc73bcbec775e27d07100
generated_at: 2026-11-10T07:41:43.603772+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/knobs.ts

## Purpose

Defines environment-variable-driven "knobs" that control how aggressively the generative (property-based) unit tests run. It exists so the pre-commit test gate stays fast by default while allowing a developer to dial up rigor locally without editing source. The file is an intentional, unsynced fork of the backend `tests/support/knobs.ts`.

## Key elements

- **`countKnob(name, fallback, minimum)`** – Reads `process.env[name]`, parses to an integer, and returns `max(minimum, parsed)` on success. If the value is unset, empty, or non-integer, it returns `fallback` (never below `minimum`). A typo therefore yields the committed default rather than zero cases.
- **`PROPERTY_RUNS`** – Exported constant: `countKnob('TEST_PROPERTY_RUNS', 200, 10)`. Sets the number of cases fast-check generates per property. Default is 200 (modest for pre-commit); floor is 10.

## Relationships

- **`tests/support/unit/setup.ts`** – The unit-test setup module that consumes `PROPERTY_RUNS` to configure fast-check's global run count for the suite. This is the primary consumer of this file's exports.
- **`src/modules/users/tests/schemas.property.spec.ts`** – A property-based spec whose per-property case count is governed by `PROPERTY_RUNS` (applied transitively via the setup module). It does not import `knobs.ts` directly.

## Notes

- Read exclusively from `process.env`, which `vitest.config.ts` populates from `.env` via an explicit allowlist. Shell environment variables override `.env`. No worker-process isolation is involved.
- Nothing under `src/` (production code) imports or reads these values; they affect only test configuration.
- The file is deliberately out of sync with the backend counterpart—do not expect changes in one to propagate to the other.
