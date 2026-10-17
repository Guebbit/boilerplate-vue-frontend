---
source: tests/cross-cutting/module-groups.spec.ts
sha256: fa19104e5dd6d4ea477cd99c1c57161b993aeaf8354d9ee5c7c48041a3abea9d
generated_at: 2026-10-17T02:01:17.512003+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/module-groups.spec.ts

## Purpose

Enforces the **completeness** half of the foundation | shop module-axis guarantee: every enabled module must have a `MODULE_GROUPS` label, no stale labels may linger for disabled modules, and both group values must be in active use. It pairs with the `foundation-may-not-import-shop` ESLint rule (which enforces *direction*) to make the axis a deliberate, non-omissible choice when adding modules.

## Key elements

- **`describe('every module sits on the foundation | shop axis')`** — top-level suite; four focused tests within.
- **"gives every enabled module a group"** — filters `enabledModules` against `MODULE_GROUPS` keys; fails with a per-module message if any module lacks an entry.
- **"names no group entry for a module that is not enabled"** — inverse check: flags any `MODULE_GROUPS` key not present in `enabledModules`, catching stale entries.
- **"is checking a non-empty set of modules and groups"** — canary guard; asserts both `enabledModules.length ≥ 1` and `MODULE_GROUPS` has ≥ 1 key, preventing the other two tests from passing vacuously.
- **"labels at least one module foundation and at least one shop"** — confirms both group values are actually exercised so the ESLint direction rule has content on each side.

## Relationships

- **`scripts/module-groups.ts`** — source of the `MODULE_GROUPS` constant under test. This spec is the *completeness* check; the ESLint rule `foundation-may-not-import-shop` (referenced in the header comment) is the *direction* check that reads the same map at import time.
- **`@/modules`** (`enabledModules`) — provides the runtime list of enabled modules used as the ground-truth set for both completeness and staleness checks.

## Notes

- The map in `scripts/module-groups.ts` is intentionally hand-maintained (no folder moves, no auto-detection). Omitting an entry causes this spec to fail rather than silently defaulting a module into a group.
- The "guard on the guard" test deliberately checks for ≥ 1 rather than an exact count, so removing a domain must also remove this canary — it won't silently drift.
- The header comment explicitly positions this file alongside `module-coupling.spec.ts` and the ESLint rule as a three-part invariant (completeness + direction + actual usage of both sides).
