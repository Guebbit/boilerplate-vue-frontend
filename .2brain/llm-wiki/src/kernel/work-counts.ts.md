---
source: src/kernel/work-counts.ts
sha256: d7adfd20c1d07710518f2d28650aa890bc718cbee9f317e2f911634182905a93
signature: 72f23682aef9b5c88912ac24a924573d412b1c7cb79d8e4b36f6cde59149cc27
generated_at: 2026-11-10T03:17:34.096917+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/work-counts.ts

## Purpose

Holds the reactive "open-work" counts shown as badges on the staff navigation. It exists so that the screen manifests that *read* a badge count never need to import the `shop-tasks` module that *writes* it, keeping the dependency direction one-way through this thin kernel file.

## Key elements

- **`useWorkCount(key)`** – Returns a `ComputedRef<number | undefined>` for a single `ShopWorkSummary` key. `undefined` means either nothing has been fetched yet or the caller lacks permission for that screen (the key is absent).
- **`setWorkCounts(next)`** – Replaces the entire internal ref with a new `ShopWorkSummary` object. Intended to be called exactly once per summary fetch.
- **`clearWorkCounts()`** – Resets the internal ref to an empty object; call when the person who populated the counts leaves the shop context.
- **`counts` (module-level `ref<ShopWorkSummary>`)** – The single shared source of truth. Not exported; all access goes through the three functions above.

## Relationships

- **`src/modules/shop-tasks/composables/use-shop-work-feed.ts`** — The sole *writer*. It calls `setWorkCounts` (and likely `clearWorkCounts`) after consuming `GET /shop-tasks/summary`, so the kernel ref always mirrors the latest server response for the active shop session.

## Notes

- The key names are dictated by the `ShopWorkSummary` type from `@types`; this file defines no domain vocabulary of its own. Adding a new screen means extending that type, not editing this module.
- An absent key is a deliberate permission signal (the user cannot open that screen), not an error. Readers should treat `undefined` as "no badge," not "zero."
- `setWorkCounts` replaces the whole object in one assignment; it is not a merge. The writer must always pass a complete summary.
