---
source: scripts/module-groups.ts
sha256: 405e2f29369512480b40769709585d16811c6d5f0043cb768b404f4ac6743243
generated_at: 2026-10-17T00:02:25.399963+00:00
model: ollama:qwen3.8:27b
---

# scripts/module-groups.ts

## Purpose

Hand-maintained mapping of every enabled frontend module to its strategic group (`foundation`, `shop`, or `example`). It is the frontend mirror of the paired backend's `module.yaml#group` field and exists so that import-direction rules and spec tests have an explicit, human-chosen classification to enforce.

## Key elements

- **`ModuleGroup`** (type) — the three allowed axis labels: `'foundation' | 'shop' | 'example'`.
- **`MODULE_GROUPS`** (const, `Record<string, ModuleGroup>`) — the full name-to-group table. 17 modules total: 6 foundation, 10 shop, 1 example. Deliberately explicit; a module missing from this map is a spec failure, not a silent default.

## Relationships

- **`eslint.config.ts`** — reads `MODULE_GROUPS` to power the `foundation-may-not-import-shop` rule (foundation modules must not import shop modules).
- **`tests/cross-cutting/module-groups.spec.ts`** — asserts that every enabled module has an entry in `MODULE_GROUPS`, forcing a human to consciously pick a group when adding a module.

## Notes

- `shop` is the removable pet-supply demo domain, corresponding exactly to `src/demo-modules.ts`'s `DEMO_MODULE_NAMES`. `example` is intentionally **not** in that list, so `npm run demo:remove` leaves the `example` module in place.
- This is a label, not a structural constraint: no folder move or directory rename is implied by assigning a group. It only codifies an import direction the code already respects.
- Maintenance is manual (same convention as `MODULE_EDGES`); there is no codegen step that populates this map.
