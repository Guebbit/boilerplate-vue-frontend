---
source: src/modules/webhooks/badge-store.ts
sha256: 1f2888e764a7f96863f2dd1e51a2901a322da0862c400f4350cefcd05f336783
signature: 32b490782bb4725ecb6f98d82927f6fe3b44e7a31bff36b5c2f0bc11259720f0
generated_at: 2026-11-10T06:11:50.073363+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/badge-store.ts

## Purpose

A dedicated Pinia store that holds a single number — the count of auto-disabled webhook subscriptions shown as a navigation badge. It is split out of the main webhooks CRUD store so the badge accessor can live in the shell's entry chunk without dragging generated schemas into that chunk.

## Key elements

- **`useWebhooksBadgeStore`** — the sole export; a setup-store (`defineStore('webhooks-badge', …)`) exposing two members:
  - **`autoDisabledTotal`** (`Ref<number | undefined>`) — the badge count; `undefined` until first read or after sign-out.
  - **`loadAutoDisabledTotal(forced?: boolean)`** — fetches `listWebhookSubscriptions({ pageSize: 1, autoDisabled: true })` via `fetchAny` and writes `page.meta.totalItems` into `autoDisabledTotal`. Resolves once the value is cached.
- **`useStructureRestApi`** — instantiated with `resourceKey: 'webhooks-badge'` and the shared `queryClient`; only the `fetchAny` member is used because the payload is a count, not a record list.

## Relationships

- **`src/modules/webhooks/composables/use-auto-disabled-badge.ts`** — the composable that reads `autoDisabledTotal` and calls `loadAutoDisabledTotal` to drive the visible badge UI. This is the sole consumer that couples the store to the shell's navigation.

## Notes

- The `pageSize: 1` request is intentional: only `meta.totalItems` is consumed, so the response body is effectively discarded.
- `asPassive()` marks the request as non-user-initiated; this affects telemetry/error-handling paths in the HTTP layer.
- The store is deliberately *not* merged into the webhooks CRUD store (`store.ts`) to keep generated schemas out of the shell entry chunk.
- `autoDisabledTotal` resets to `undefined` on sign-out (handled externally); the store itself does not watch auth state.
