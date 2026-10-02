---
source: scripts/e2e/cypress-spec-globs.ts
sha256: 41b3ab3e0809fc68d27a5a0c265d21c9005ac0bbd674c5778693ec269c7e658b
generated_at: 2026-10-02T11:33:26.401546+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/cypress-spec-globs.ts

## Purpose

Single source of truth for where Cypress spec files live. Because `cypress.config.ts`, `eslint.config.ts`, `run-shards.ts`, and `package.json` all need the same glob set but cannot import from each other, this module exports the canonical constants so those consumers stay in agreement without duplicating strings.

## Key elements

- **`FUNCTIONAL_SPEC_GLOBS`** — Globs for the default gate (`test:e2e`). Excludes `.visual.cy.ts` and `.antibot.cy.ts` via negative lookaheads.
- **`VISUAL_SPEC_GLOBS`** — Globs for the pixel-diff suite; intentionally not part of the `npm run complete` gate.
- **`ANTIBOT_SPEC_GLOBS`** — Globs for specs that require a human-challenge backend; run in their own shard.
- **`ALL_SPEC_GLOBS`** — Spread-union of the three arrays above. This is what `specPattern` should reference (not just the functional subset), so that a `--spec` targeting visual or antibot files still intersects the pattern.

## Relationships

- **`cypress.config.ts`** — Reads these constants to set `specPattern`.
- **`eslint.config.ts`** — Reads these constants to decide which parser handles a given file.
- **`scripts/e2e/run-shards.ts`** — Reads these constants to determine what the default gate schedules.
- **`scripts/e2e/print-live-shard.ts`** — Consumes the same shard definitions (antibot and visual shards) for the live matrix.
- **`tests/unit/scripts/e2e/cypress-spec-globs.spec.ts`** — Asserts that the glob strings hardcoded in `package.json` resolve to the same file set as the constants here (the only link, since `package.json` cannot import).

## Notes

- Cypress **intersects** `--spec` with `specPattern`. A spec outside the pattern is silently unrunnable even when named explicitly; a glob one level too shallow yields a green run with fewer specs.
- Visual and antibot specs are excluded/included by **suffix** (`*.visual.cy.ts`, `*.antibot.cy.ts`), not by directory, so each module owns its baselines alongside its functional specs.
- `ALL_SPEC_GLOBS` uses `.cy.ts` exclusively; a `.cy.js` file is an anomaly the lint step is expected to catch.
