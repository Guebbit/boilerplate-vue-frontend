---
source: tests/unit/scripts/e2e/antibot-backend.spec.ts
sha256: d431b25450f9cdafd245ffb75dcb96b39d89ad6b95d448a146f56ce323cec722
signature: 67876fefb7f8b4d82b15e2a35be3bd8fa2dc1ac32e24f8ef80498dc483d16040
generated_at: 2026-11-10T08:14:44.474561+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/antibot-backend.spec.ts

## Purpose

Unit tests for the antibot backend configuration and flag-detection helpers defined in `scripts/e2e/antibot-backend.ts`. It verifies that the environment constant is safe for spec execution (low altcha cost, small login budget) and that the live GitHub workflow actually boots with the same values, catching drift between the JS constant and the YAML that cannot import it.

## Key elements

- **`REPO_ROOT`** — Resolves the repository root by going four levels up from this file's directory. Used to locate the workflow YAML.
- **`describe('ANTIBOT_BACKEND_ENV')`** — Three tests:
  - Provider is `altcha`, secret is non-empty, cost < 100 000 (so a spec can solve it).
  - `NODE_AUTH_RATE_LIMIT_MAX` ≤ 10 so the per-account login check is reachable within a spec.
  - Reads `.github/workflows/e2e-live.yml` as plain text and asserts every `name: ${{ matrix.shard == 'antibot' && '<value>' || ` line produced from the constant actually appears in the workflow.
- **`describe('wantsAntibotBackend')`** — One test covering `wantsAntibotBackend` with the flag present (alone and among other args) and absent (empty array, other args only).

## Relationships

- **Imports from `scripts/e2e/antibot-backend.ts`:** `ANTIBOT_BACKEND_ENV` (env-var record), `ANTIBOT_FLAG` (the CLI flag string), and `wantsAntibotBackend` (flag-detection predicate). These are the only cross-file dependencies.

## Notes

- The workflow test only checks the **left half** of the `||` expression (the antibot-specific branch). The right half is shared by all shards and is intentionally not asserted here.
- The cost assertion is `< 100_000`, not `≤`, because the production default is exactly 100 000; the antibot override must be strictly lower.
- `REPO_ROOT` is derived from `import.meta.url` (ESM) rather than a hardcoded relative path, so the test is location-independent within the repo layout.
- The workflow file is read as text via `readFileSync` at test time because YAML in GitHub Actions cannot import a TS constant; the test enforces that the two stay in sync.
