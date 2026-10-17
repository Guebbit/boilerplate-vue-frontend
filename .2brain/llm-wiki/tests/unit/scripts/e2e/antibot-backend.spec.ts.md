---
source: tests/unit/scripts/e2e/antibot-backend.spec.ts
sha256: d431b25450f9cdafd245ffb75dcb96b39d89ad6b95d448a146f56ce323cec722
generated_at: 2026-10-17T02:42:04.694685+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/antibot-backend.spec.ts

## Purpose

Unit test suite for `scripts/e2e/antibot-backend.ts`. Verifies that the antibot backend environment constants are set to values solvable in a spec, that those same values are embedded in the live CI workflow YAML, and that the `wantsAntibotBackend` flag parser works correctly.

## Key elements

- **`ANTIBOT_BACKEND_ENV` (tested)** — Asserts provider is `altcha`, a non-empty secret exists, cost is below 100 000, and `NODE_AUTH_RATE_LIMIT_MAX` is ≤ 10 so the rate-limit check is reachable in a test.
- **Workflow YAML consistency test** — Reads `.github/workflows/e2e-live.yml` as raw text and asserts every `NAME: ${{ matrix.shard == 'antibot' && 'value' || ` fragment appears verbatim. Catches drift between the JS constant and the YAML.
- **`wantsAntibotBackend` (tested)** — Confirms it returns `true` when `ANTIBOT_FLAG` is present (alone or among other args) and `false` when absent.
- **`REPO_ROOT`** — Resolves the repo root (four levels up from this spec file) so the workflow test can locate the YAML.

## Relationships

- **`scripts/e2e/antibot-backend.ts`** — The module under test. This spec imports `ANTIBOT_BACKEND_ENV`, `ANTIBOT_FLAG`, and `wantsAntibotBackend` from it.
- **`.github/workflows/e2e-live.yml`** — Read as a plain-text file (not parsed) solely to string-match the env-var fragments emitted by `ANTIBOT_BACKEND_ENV`.

## Notes

- The workflow check is intentionally a **string containment** test, not a YAML parse, because the live workflow is YAML that cannot `import` a JS constant. It only inspects the left-hand side of the `||` fallback expression (the antibot-specific value).
- The altcha cost assertion (`< 100_000`) exists because the library default is 100 000, which would be impractically expensive to solve in a spec.
- The rate-limit assertion (`≤ 10`) keeps the wrong-password threshold (half the budget) small enough that a test can actually trigger the check.
