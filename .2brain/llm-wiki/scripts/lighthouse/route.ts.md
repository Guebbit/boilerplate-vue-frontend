---
source: scripts/lighthouse/route.ts
sha256: 6a56d9e4237f07354bd75da7778a8d4cea73b5dde5e9cb93ed21843401ff1075
signature: d7deecd37da655990a82bdf2d501f8f82792239258ea41289a1d4371f9dc8c96
generated_at: 2026-11-10T02:43:37.564981+00:00
model: ollama:qwen3.8:27b
---

# scripts/lighthouse/route.ts

## Purpose

Pure utility that resolves a test-case route string by replacing every `{subject:<guarantee name>}` placeholder with the concrete row id the backend publishes via `/__test/scenario`. It isolates the name→id substitution so callers (e.g. the lighthouse collect step) can work with fully-resolved routes without caring about the placeholder syntax.

## Key elements

- **`PLACEHOLDER`** (module-private regex) — global pattern `/{subject:([^}]+)}/g` used to locate and capture every placeholder in a route string.
- **`resolveRoute(route, subjects)`** (exported) — returns a new string with all `{subject:x}` tokens replaced by `subjects[x]`. Throws a descriptive `Error` listing the offending name and the names the backend *does* publish when a lookup misses.

## Relationships

- **`scripts/lighthouse/collect.ts`** — the natural caller; the collect pipeline supplies the route string and the backend's subject map, then consumes the resolved route to build the final scenario description.
- **`tests/unit/scripts/lighthouse/route.spec.ts`** — unit tests that exercise `resolveRoute` (happy-path substitution, multiple placeholders, unknown-subject error message).

## Notes

- The function is **pure**: no I/O, no mutation. All data arrives via the `subjects` parameter.
- `replaceAll` is used (not `replace`), so *every* placeholder in the string is resolved in one pass.
- The error message intentionally echoes the full original route and the list of published subjects to make misconfiguration obvious in CI logs.
- `subjects` is typed as `Readonly<Record<string, string>>` at the boundary but internally cast to `Partial<Record<string, string>>` so the `undefined` check is type-safe.
