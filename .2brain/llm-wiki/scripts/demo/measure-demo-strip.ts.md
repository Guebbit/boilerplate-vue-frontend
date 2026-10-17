---
source: scripts/demo/measure-demo-strip.ts
sha256: 0e7eb4332e85df7a321ef6d87fe74c8f03f0dc91c73903bfa2b39f5f26fcdfc5
generated_at: 2026-10-16T23:59:02.146939+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/measure-demo-strip.ts

## Purpose

Report-only measurement script that answers "how far *is* the demo shop removable?" by stripping all named demo modules from a scratch copy of the frontend checkout and then running `type-check-only`, `lint`, and `build-only` against what remains. It deliberately never touches the real working tree—failures are a punch list, not a merge blocker.

## Key elements

- **`REPO_ROOT`** / **`SCRATCH`** — Resolved paths. Scratch lives under `os.tmpdir()` (`fe-demo-strip-measure`), never under the repo.
- **`SKIP_ENTRIES`** — Set of top-level directories excluded from the scratch copy (`node_modules`, `.git`, `dist`, `dist-e2e`, `coverage`).
- **`Check`** (interface) / **`CHECKS`** (const array) — The three npm commands the stripped copy must pass: `type-check-only`, `lint`, `build-only`.
- **`assembleScratchCopy()`** — Wipes and rebuilds `SCRATCH` from `REPO_ROOT` (filtering out `SKIP_ENTRIES`), then symlinks `node_modules` so module resolution works without a second install.
- **`stripDemoModules(names)`** — Applies the same deletion logic `demo:remove` uses, but against `SCRATCH`: removes module folders, strips the registry, prunes coupling-graph edges, deletes the manifest, and removes cross-module specs.
- **`run(check)`** — Spawns the check command with `cwd: SCRATCH` and `stdio: 'inherit'`; returns a boolean. Never throws—a non-zero exit *is* the measurement.
- **Top-level flow** — Reads module names → assembles scratch → strips → runs all checks → prints per-check PASS/FAIL summary → sets `process.exitCode`.

## Relationships

- **`scripts/demo/demo-module-names.ts`** — Provides `readDemoModuleNames(REPO_ROOT)`, the list of demo modules to strip.
- **`scripts/demo/demo-remove-registry.ts`** — Provides `removeModuleFolders`, `stripModuleRegistry`, `pruneModuleEdges`, and `removeManifest`; all four are called inside `stripDemoModules` with `SCRATCH` as the root.
- **`scripts/demo/demo-remove-tests.ts`** — Provides `removeResidueSpecs`, also called in `stripDemoModules` to delete cross-module spec files.

## Notes

- **`.git` is never copied.** This repo's `.git` is a worktree gitlink pointing at shared metadata; running a git command against a copy of it would stage changes into the *real* checkout's index.
- **`node_modules` is symlinked, not copied**, so the scratch tree reuses the original install.
- **ESM script** — resolves `REPO_ROOT` via `import.meta.url` rather than `__dirname`; the shebang is `#!/usr/bin/env tsx`.
- **Report-only contract.** A failing check yields `process.exitCode = 1` but no side effects on the working tree. This is the frontend twin of the backend's `measure:demo-strip`; the destructive counterpart is `demo:remove`.
