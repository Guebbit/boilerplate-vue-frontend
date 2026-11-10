---
source: src/modules/users/composables/use-review-badge.ts
sha256: c91a47cb2d93de90af0ac38f1c866059d11b37c620d8fd122124f1a924b7685d
signature: 7eb70f878031241579abacc03679d95e4cb131afcfd12041d285a0ab0cfd8b24
generated_at: 2026-11-10T06:03:30.633596+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/composables/use-review-badge.ts

## Purpose

Provides the live "accounts flagged for review, unactioned" count that the users nav entry displays in the shell. It reads the total from the users badge store, gates it on the viewer's `read User` permission, and subscribes to the shared badge-refresh triggers so the number stays current without the users list being open.

## Key elements

- **`useReviewBadge()`** (sole export) — Returns `Ref<number | undefined>`. Wires `useBadgeRefresh` to the users badge store:
  - `readerId` is `session.viewer.id` only when `session.can('read', 'User')` is true; otherwise `undefined` (no badge for that viewer).
  - `read(forced)` delegates to the store's `loadReviewTotal` method.
  - `clear()` resets `reviewTotal` back to `undefined`.
- **`reviewTotal`** (from `useUsersBadgeStore` via `storeToRefs`) — The reactive value actually rendered by the nav badge. `undefined` means "nothing to show" (not zero).

## Relationships

- **`src/modules/users/badge-store.ts`** — Direct import. The composable obtains the Pinia store via `useUsersBadgeStore()`, destructures its `reviewTotal` ref, and delegates all refresh work (`loadReviewTotal`, clearing) to that store. All badge state lives in the store; this file adds no state of its own.
- **`src/modules/users/module.ts`** — Module boundary. This composable is part of the users foundation module; it deliberately imports no shop-level code (per the file's module doc comment).

## Notes

- Call site: the nav entry's `badge` accessor should call `useReviewBadge()` exactly once; it is designed for that single consumer.
- "Nothing to show" is expressed as `undefined`, **not** `0` — any consumer that checks truthiness or renders conditionally must treat `undefined` as "hide the badge."
- The permission check uses the string resource `'User'` (capital U) against the session store's `can()` method; there is no separate role or flag.
- Because `useBadgeRefresh` is invoked at the top level of the composable (not inside a `setup`), the refresh subscription is tied to the nav entry's lifecycle, not to any individual page.
