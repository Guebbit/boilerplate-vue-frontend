---
source: scripts/demo/measure-demo-strip.ts
sha256: 9ef08395d0f4d82f1f42a30a583f227b8209a115bdb8507849eceda88b293ab5
generated_at: 2026-10-02T11:31:07.009846+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/measure-demo-strip.ts

## Purpose

A report-only measurement script (FE-D4 step 1) that answers "how far is the demo shop from being removable?" by assembling a scratch copy of the repo, deleting every demo module listed in `src/demo-modules.ts`, and running `type-check-only`, `lint`, and `build-only` against what remains. It explicitly does **not** mutate the real checkout and is not a merge gate — a failing check is a punch-list item, not a blocker.

## Key elements

- **`REPO_ROOT`** — resolved via `import.meta.url` (ESM) to the repo root two levels up from this file.
- **`SCRATCH`** — fixed path under `os.tmpdir()`; the throwaway tree the script operates on.
- **`SKIP_ENTRIES`** — set of top-level directories (`node_modules`, `.git`, `dist`, `dist-e2e`, `coverage`) excluded from the scratch copy.
- **`CHECKS`** — readonly array of the three `npm run` commands to execute (`type-check-only`, `lint`, `build-only`).
- **`assembleScratchCopy()`** — wipes and recreates `SCRATCH`, copies the repo with a `cpSync` filter that skips `SKIP_ENTRIES`, then symlinks the real `node_modules` into the scratch tree.
- **`stripDemoModules(names)`** — `rmSync`s each `src/modules/<name>` directory inside `SCRATCH`.
- **`run(check)`** — `spawnSync`s the command with `cwd: SCRATCH` and `stdio: 'inherit'`; returns a boolean (never throws — a non-zero exit *is* the measurement).
- **Main flow** — reads module names, assembles scratch, strips, runs all checks, prints a PASS/FAIL summary, and sets `process.exitCode` (0 all-pass, 1 any-fail).

## Relationships

- **`scripts/demo/demo-module-names.ts`** — imported for `readDemoModuleNames(REPO_ROOT)`, which returns the list of demo module directory names the script deletes from the scratch tree. This is the sole cross-file dependency.

## Notes

- **`.git` is never copied.** The repo's `.git` is a worktree gitlink pointing at shared metadata; running a git command against a copy would stage changes into the *real* checkout's index.
- **`node_modules` is symlinked, not copied.** Node's module resolution follows the symlink transparently, so the scratch tree gets working imports without a second `npm install`.
- **Exit code vs. merge gate.** `process.exitCode = 1` on any failure makes CI pipelines see a red, but the script's own messaging (and the doc-block) frame it as a diagnostic, not a blocking gate. The counterpart `demo:remove` script is the one that actually edits the live checkout.
- **ESM script** — run via the `tsx` shebang; uses `import.meta.url` rather than `__dirname`.
- **Idempotent scratch assembly** — `assembleScratchCopy` always `rmSync`s then recreates `SCRATCH`, so repeated runs never accumulate stale files.
