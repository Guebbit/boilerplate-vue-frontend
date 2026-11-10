---
source: tests/unit/kernel/work-counts.spec.ts
sha256: b1654f58c8ad4734118a0feecad853dea16c5063534eeb6a4f7bd704a466a723
signature: b1654f58c8ad4734118a0feecad853dea16c5063534eeb6a4f7bd704a466a723
generated_at: 2026-11-10T08:11:15.902127+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/work-counts.spec.ts

## Purpose

Unit tests for the kernel's work-counts module, verifying the writer→reader→clear lifecycle: `setWorkCounts` replaces the entire map, `useWorkCount` exposes a reactive per-key value, and `clearWorkCounts` resets every key.

## Key elements

- **`afterEach(clearWorkCounts)`** — resets state between tests so each case starts clean.
- **`describe('the work counts')`** — two test cases covering the full lifecycle.
- **Test 1: "hands a reader the count of its own key, and follows the next write"** — Asserts that `useWorkCount('salesOrders')` is initially `toBeUndefined()`, reflects `4` after `setWorkCounts({ salesOrders: 4, returns: 1 })`, and returns to `toBeUndefined()` when the map is replaced with a shape that omits the key.
- **Test 2: "empties every key when the reader is gone"** — Asserts that `clearWorkCounts()` makes every previously-set key read `toBeUndefined()` again.

## Relationships

No graph neighbors are listed for this file. The sole import is `clearWorkCounts`, `setWorkCounts`, and `useWorkCount` from `@/kernel/work-counts.ts`, the production module under test. Vitest provides the test-runner primitives (`afterEach`, `describe`, `expect`, `it`).

## Notes

- `setWorkCounts` is a **full replace**, not a merge. Setting `{ salesOrders: 0 }` causes any previously-present key (e.g. `returns`) to no longer be resolvable. This is the behavior the first test locks in.
- `useWorkCount` returns an object with a `.value` property (a reactive ref), not a plain number. Tests always access `.value`.
- There are no isolated tests for the "writer replaces, reader follows" contract across concurrent keys beyond the two cases shown; the file is intentionally minimal.
