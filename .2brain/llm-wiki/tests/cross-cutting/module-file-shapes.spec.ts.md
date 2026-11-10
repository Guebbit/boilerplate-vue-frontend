---
source: tests/cross-cutting/module-file-shapes.spec.ts
sha256: f0778eab60f51a114e42626c072a51926346e8402871fdc6481391b86a92a079
signature: 6acf8c3e0f21e728d502209968001876d1a62600e5ba500e6dd23c4ebe82dd45
generated_at: 2026-11-10T06:38:16.248304+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/module-file-shapes.spec.ts

## Purpose

Cross-cutting guard that enforces a single source of truth for size bounds. Because the backend contract generates constants (e.g. `createWebhookSubscriptionBodyUrlMax`), any numeric literal in a module's `schemas.ts` is a second copy that will drift silently. This test walks every enabled module's folder, reads each `schemas.ts`, and fails if a hard-coded number appears in a size-constraining Zod call.

## Key elements

- **`MODULES_ROOT`** – Resolves the absolute path to `src/modules` relative to the test file.
- **`walk(directory, base)`** – Recursive directory walker; returns sorted relative paths of every file under `directory`.
- **`filesInModules()`** – Iterates `enabledModules` (from `@/modules`), calls `walk` on each module folder, and returns a flat list of `{ module, file }` pairs.
- **`schemaFiles()`** – Filters `filesInModules()` to entries where `file === 'schemas.ts'` and reads their text via `readFileSync`.
- **`LITERAL_BOUND`** (regex) – Matches `.min()`, `.max()`, `.length()`, `.gte()`, `.lte()`, `.gt()`, `.lt()` calls whose argument is a numeric literal (a digit followed by optional digits, dots, or underscores).
- **Test: "finds the schema files it means to check"** – Sanity check that at least 10 `schemas.ts` files are discovered.
- **Test: "writes no size bound as a number"** – Collects all `LITERAL_BOUND` matches across all schema files, excludes the one allowed case (`.min(1)`), and asserts the list is empty.

## Relationships

- **`src/modules/shop-tasks/tests/notices.spec.ts`** – Lives inside the `shop-tasks` module folder that this test sweeps. The two files share no import; the connection is purely structural (same module tree under `src/modules/`).

## Notes

- `.min(1)` is the **only** numeric literal permitted. The rationale (documented in the file header): `.min(1)` expresses "non-empty" and pairs with a field-level translated error message, so it is not a restated contract bound.
- The regex also matches digits with `.` and `_` (e.g. `1_000`), guarding against formatted literals.
- The test depends on `enabledModules` from `@/modules`; a module that is disabled will be silently skipped, so the sweep only covers active modules.
- The file is in `tests/cross-cutting/`, not inside any single module folder, which keeps it from being scoped by a module's own test config.
