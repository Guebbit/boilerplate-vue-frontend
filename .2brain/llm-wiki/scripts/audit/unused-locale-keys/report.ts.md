---
source: scripts/audit/unused-locale-keys/report.ts
sha256: 9e3853518a0df65fabf52223806c3d524038f8934c2c102954eb929b566b4506
signature: 8be0cc1debf5be5d9602d8cf4975f85dfa343311fa5ab06d31d48c787c9e502a
generated_at: 2026-11-10T02:23:43.186553+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/unused-locale-keys/report.ts

## Purpose

CLI report script that lists every locale key no code reads. It is intentionally non-blocking: it prints findings to stdout and always exits 0, so it can be run ad-hoc or in CI without failing a build.

## Key elements

- **Top-level script body** (no named exports) — calls `scanLocaleKeys()`, iterates the `unused` array printing each line via `console.info`, then prints a one-line summary (`N unused key(s) across M file(s).`).
- **`scanLocaleKeys`** (imported from `./scan`) — performs the actual scanning; this file only formats and prints its result.

## Relationships

- **`scripts/audit/unused-locale-keys/scan.ts`** — sole import. `scanLocaleKeys()` is the only cross-file call; it returns `{ unused: string[], files: number }` which this script renders.

## Notes

- Always exits 0 and edits nothing — it is a *report*, not a *gate*. Do not add `process.exit(1)` paths without changing the script's contract.
- Output goes to `console.info` (stderr), not `console.log`; redirect with `2>&1` if you need to capture it in a pipe.
- Invoked via `npm run audit:locale-keys` (see package.json); the `#!/usr/bin/env tsx` shebang means it runs without a build step.
