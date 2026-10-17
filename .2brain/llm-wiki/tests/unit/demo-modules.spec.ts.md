---
source: tests/unit/demo-modules.spec.ts
sha256: f5d50eee2df4636c9c8231eb0b045e367fa4cca8df2744132cae9c517003797b
generated_at: 2026-10-17T02:33:22.636552+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/demo-modules.spec.ts

## Purpose

Guarantees that the `DEMO_MODULE_NAMES` manifest stays in lockstep with the modules actually mounted at runtime (`enabledModules`). It catches two failure modes: a listed name that no module mounts (making `npm run demo:remove` a no-op that misreports), and a mounted shop module that is missing from the list (silently surviving a strip).

## Key elements

- **`describe('demo manifest')`** — top-level suite containing the two checks below.
- **`it('names only modules this build actually mounts')`** — asserts every entry in `DEMO_MODULE_NAMES` resolves to a module present in `enabledModules`; flags any "ghost" names.
- **`it('a canary that cannot pass empty…')`** — asserts the list is non-empty *and* that at least one mounted module is **not** in the list, preventing the manifest from silently becoming a copy of the full module array (or being emptied) without the test noticing.

## Relationships

- **`@/demo-modules`** — source of `DEMO_MODULE_NAMES`, the array under test.
- **`@/modules`** — source of `enabledModules`, the ground-truth set of mounted app modules.

No other graph neighbors are recorded.

## Notes

- The second test is deliberately a *canary*, not a strict equality check: it only verifies the list is a proper non-empty subset of `enabledModules`. Full bidirectional equality is enforced by the first test plus the canary.
- The doc block references `docs/theory/module-lifecycle.md` as the conceptual home for this invariant on the backend side; keep that doc in sync if the semantics of `DEMO_MODULE_NAMES` change.
- Adding a new demo module means updating **both** `@/demo-modules` and `@/modules`; if only one side is touched, this suite fails.
