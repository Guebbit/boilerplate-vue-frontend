---
source: src/modules/notifications/types.ts
sha256: 1f571b4479244526522fb8c4a73c7d8a95b1cd24301876048d65850cb374186f
generated_at: 2026-10-17T01:10:37.496791+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/types.ts

## Purpose

Declares the view-model shape (`InboxItem`) that the notification bell panel renders. It exists to separate the UI-facing contract from raw server/toolkit payloads—no endpoint returns this shape directly.

## Key elements

- **`InboxItem`** (interface) — one row in the bell panel. Fields: `id` (server/toolkit message id), `text` (localized sentence), `type` (`EToastType` used for row colour), `createdAt` (ISO string as sent by the server), `orderId?` (optional; present when the notification links to an order), `unread` (boolean flag).
- **`EToastType`** (type-import from `@guebbit/vue-toolkit`) — the enum that drives row colour; the panel maps `info` → `primary` at render time.

## Relationships

- **`src/modules/notifications/store.ts`** — imports and uses `InboxItem` as the shape it assembles from the toolkit message store and exposes to the panel; this file is the type contract the store must fulfil.

## Notes

- `type` carries the raw `EToastType` value; the `info` → `primary` remap happens in the panel's rendering layer, not in this type.
- `createdAt` is deliberately kept as the server's ISO string, not a `Date`, to avoid premature parsing.
- `orderId` is optional; when absent the bell renders no order link for that row.
- The module is view-only: nothing defined here is serialised back to the server.
