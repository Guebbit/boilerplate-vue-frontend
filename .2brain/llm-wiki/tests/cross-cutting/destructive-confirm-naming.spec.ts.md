---
source: tests/cross-cutting/destructive-confirm-naming.spec.ts
sha256: 4703c3ab9906c82c9185ad104a315943e9af0b46edbde6f20ee9ab3728560163
generated_at: 2026-10-17T02:00:07.300308+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/destructive-confirm-naming.spec.ts

## Purpose

Cross-cutting guard test that enforces a single convention: every destructive (`color: 'error'`) confirm dialog must name its target via a `t(key, { … })` interpolation param, so a visitor can tell *which* row they are about to delete. It exists to prevent new components from regressing to bare "delete this item?" wording.

## Key elements

- **`SELF_ONLY_FILES`** — file-level allowlist (four `account` profile components) where "this" legitimately refers to the viewer's own account and no row identity is needed.
- **`componentFiles(directory)`** — recursively collects every `.vue` file under a directory, skipping any subdirectory named `tests`.
- **`confirmBlocksOf(source)`** — extracts each `.confirm({ … })` object literal from source text using a brace-depth scanner (avoids early-terminating on the inner `{ … }` of `t(key, { name })` params).
- **`isDestructive(block)`** — regex check for `color: 'error'` inside a confirm block.
- **`namesItsTarget(block)`** — returns `true` when the `message` either omits a direct `t(` call (treated as already-named) or passes an interpolation object to `t(key, { … })`.
- **`describe / it` block** — single assertion: flatMap over all collected components, filter for destructive confirms that fail `namesItsTarget`, and expect the resulting array of file paths to be empty.

## Relationships

No dependency-graph neighbors are recorded for this file. It reads `.vue` files under `src/modules` at test time (via `node:fs`) and depends only on `vitest`.

## Notes

- The brace-balancing in `confirmBlocksOf` is deliberate: a naive `\{[^}]*\}` regex would stop at the first `}` inside the `t(key, { name })` interpolation and misclassify a named confirm as unnamed.
- The allowlist is **file-level**, not line-level: every confirm inside those four files is assumed to be a self-account action. Adding a non-self destructive confirm to one of them would silently pass.
- A `message` that is assigned from a variable (rather than an inline `t(…)` call) is intentionally exempted — the sweep treats it as "named elsewhere" and does not flag it.
- The test resolves paths relative to `process.cwd()` (the repo root where `vitest` runs); it will not find components if invoked from a different working directory.
