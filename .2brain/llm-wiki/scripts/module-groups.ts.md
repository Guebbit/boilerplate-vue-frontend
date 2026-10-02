---
source: scripts/module-groups.ts
sha256: a1dc66f56bbce6a0658992e9d2ca47d462ab92cbbcc61ee925ef92d9a2ce2379
generated_at: 2026-10-02T11:38:39.168181+00:00
model: ollama:qwen3.8:27b
---

# scripts/module-groups.ts

## Purpose

Hand-maintained map of which `foundation | shop` axis each frontend module belongs to. It is the FE mirror of the paired backend's `module.yaml#group` field and exists to make the foundation/shop boundary explicit so that the ESLint import rule and the cross-cutting spec can enforce it. A new module cannot appear without a human assigning a group — that is the design intent.

## Key elements

- **`ModuleGroup`** (type) — the two-valued axis: `'foundation' | 'shop'`.
- **`MODULE_GROUPS`** (const, `Record<string, ModuleGroup>`) — the full mapping of every enabled module name to its group. Deliberately explicit rather than derived from `DEMO_MODULE_NAMES`; an unlisted module fails the spec instead of silently defaulting.

## Relationships

- **`eslint.config.ts`** — reads `MODULE_GROUPS` to power the `foundation-may-not-import-shop` rule, blocking `foundation` modules from importing `shop` modules.
- **`tests/cross-cutting/module-groups.spec.ts`** — asserts that every enabled module has an entry in `MODULE_GROUPS`, enforcing the "someone must pick a group" invariant.

## Notes

- `shop` is synonymous with the `DEMO_MODULE_NAMES` list in `src/demo-modules.ts` (the `npm run demo:remove` manifest), but this file does **not** derive from it; the two are kept in sync manually.
- Assigning a group is a label only — no folder move or re-export follows (see `DECISIONS_0926_7_FRONTEND_LAYOUT.md`). It locks in a direction the imports already respect.
- Maintenance is analogous to `MODULE_EDGES`: you add a module here at creation time, not retroactively.
