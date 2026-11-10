---
source: scripts/lighthouse/update-baseline.ts
sha256: 324d9f2d85607ee01746a3028e4b22029f2ed53d0aee229263f19a81d2df2886
signature: 324d9f2d85607ee01746a3028e4b22029f2ed53d0aee229263f19a81d2df2886
generated_at: 2026-11-10T02:44:21.181236+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/update-baseline.ts

## Purpose

CLI script (run via `tsx`) that promotes a **proposed** Lighthouse baseline written by the test suite into the committed `lighthouse-baseline.json` file. It exists to give developers a one-step "ratchet up" action: run the tests, review the diff this script produces, then commit.

## Key elements

- **Inline script logic** (no named functions/exports): reads `PROPOSED_BASELINE_PATH`, calls `ratchet()` to merge the proposed cases into the current baseline, writes the result to `LIGHTHOUSE_BASELINE_PATH`, and logs a summary of added / improved / dropped entries.
- **Guard clause** – if `PROPOSED_BASELINE_PATH` does not exist, prints a hint to run `npm run test:lighthouse` first and sets `process.exitCode = 2`.

## Relationships

- **`scripts/lighthouse/baseline.ts`** — sole dependency. Imports the two path constants (`LIGHTHOUSE_BASELINE_PATH`, `PROPOSED_BASELINE_PATH`), the `ratchet` function (performs the actual merge/comparison), the `readBaseline` helper (loads the current baseline), and the `LighthouseBaseline` type.

## Notes

- **Exit code 2** (not 1) is the convention for "no proposed baseline found"; CI or pre-commit hooks can distinguish this from a genuine error.
- The script intentionally **does not** auto-commit or auto-stage the result — the caller is expected to `git diff`, review, and commit manually (see `docs/tools/lighthouse.md#baseline-and-ratchet`).
- Must be run **after** `npm run test:lighthouse`, which is what writes the proposed baseline file.
- Executed with the `tsx` shebang, not plain `node`; the repo's `package.json` script `test:lighthouse:baseline` wires it up.
