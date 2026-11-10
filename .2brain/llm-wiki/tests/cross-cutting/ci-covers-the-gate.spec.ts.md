---
source: tests/cross-cutting/ci-covers-the-gate.spec.ts
sha256: c185b348526eb36c198ec45dbae85359ca33b985ad8022e82141ed208013da54
signature: 0f86e317919f8da9fc744c7614f78427e89a2edcde4662b0279b5cae09e2602e
generated_at: 2026-11-10T06:35:34.873818+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/ci-covers-the-gate.spec.ts

## Purpose

Guard test that verifies every leaf check in the `npm run complete` gate chain has a corresponding CI job in `.github/workflows/`. It exists to close the bypass path where a contributor uses `--no-verify` or opens a PR from a fork: without this invariant, a new local-only check would pass the gate but never run in CI, leaving the PR green. The test is one-directional—CI may legitimately run *more* than the gate (e.g. `mutation.yml`, `lighthouse.yml` are scheduled-only).

## Key elements

- **`REPO_ROOT`** — Resolves the repo root two levels above this file's directory.
- **`packageScripts()`** — Reads the `scripts` table from `package.json` into a flat record.
- **`expand(script, all, seen)`** — Recursively expands an `npm run` chain into the set of *leaf* script names. Splits on `&&`, matches `npm run <name>` steps, and recurses into those names. Cycle-safe via the `seen` set.
- **`workflowText()`** — Concatenates the non-comment lines of every `.yml` in `.github/workflows/`.
- **`scriptsRunByCi(all, text)`** — Extracts every `npm run <name>` invocation from the workflow text and expands each into its leaf names, returning a `Set`.
- **`commandsSpelledOut(command, text)`** — Checks whether a leaf script's individual `&&` segments appear verbatim (or prefixed with `npx`) in the workflow text. Handles the case where CI runs sub-commands directly rather than via `npm run`.
- **`COVERED_UNDER_OTHER_NAMES`** — Small, documented exception map (e.g. `test:unit` → `test:unit:ci`, `build` → `type-check-only` + `build-only`). Each entry must be justified in a diff.
- **`it('leaves no member of complete without a job', …)`** — The primary assertion: the expanded `complete` chain must be a subset of CI-covered names (direct, spelled-out, or aliased).
- **`it('actually reads both sides', …)`** — Canary test asserting both sides produce > 5 entries, preventing a vacuous pass if a path moves.

## Relationships

- **`src/modules/shop-tasks/tests/notices.spec.ts`** — No direct code-level dependency. The graph link is structural (both are test files in the repo); this spec does not import or reference that module.

## Notes

- **Fork, not synced.** The header calls out that this is a fork of a BE-repo test and is *not* kept in step. Changes to the BE original must be cherry-picked manually.
- **One-directional by design.** CI running extra scheduled jobs (`mutation.yml`, `lighthouse.yml`) is expected and must not be flagged. Do not add a reverse assertion.
- **Exception list is intentionally tiny.** `COVERED_UNDER_OTHER_NAMES` exists because the alternative (semantic command comparison) is worse. Adding an entry requires a written justification in the PR diff.
- **Expansion is name-based, not argument-based.** The test compares script *names* after expansion. If a CI job invokes a leaf script with different CLI arguments, `commandsSpelledOut` catches it by matching the raw command segments (including `npx`-prefixed forms).
- **`&&` is the only chain delimiter recognised.** A gate member that uses `;`, `||`, or subshells will not be split correctly by `expand` or `commandsSpelledOut`.
