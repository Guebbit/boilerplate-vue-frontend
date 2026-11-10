---
source: src/modules/notifications/types.ts
sha256: 1afafa98393ca837ce6d954267471bcc173712ed84da71d26c2bb568fd5c5199
signature: d647d95cd45c229f205988e86d150b6df0c763165cf6a3bc66d17c96979a342c
generated_at: 2026-11-10T04:50:42.454999+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/types.ts

## Purpose

Defines the presentation-layer shape for the notification bell panel. It is a view-only projection assembled from the toolkit's message store — no API endpoint returns these objects directly, and no logic lives here.

## Key elements

- **`InboxItem`** (exported interface) — one row in the bell panel. Fields:
  - `id` – server / toolkit message id.
  - `text` – fully localised sentence ready to render.
  - `type` – `EToastType` variant used for row colouring (`info` is pre-mapped to `primary`).
  - `createdAt` – ISO timestamp string as sent by the server.
  - `target?` – optional `NoticeTarget` linking the row to a screen, when the build ships that route and the reader may open it.
  - `unread` – whether the owner has not yet opened the bell since arrival.
  - `audience` – `NotificationAudience` (`own` | `staff`); the panel's tabs split on this.

## Relationships

- **`src/modules/notifications/store.ts`** – Consumes `InboxItem` as the item shape for the store's exposed state / selectors that feed the bell panel.
- **`@guebbit/vue-toolkit`** – Source of the `EToastType` enum used for the `type` field.
- **`@types`** – Source of the `NotificationAudience` type.
- **`@/kernel/registry`** – Source of the `NoticeTarget` type.

## Notes

- This file is types-only; it has no runtime exports and should be imported with `import type` to avoid pulling in side-effects.
- The `type` field is *already* mapped (`info` → `primary`) by the time it reaches this shape, so the panel should not re-map.
- `target` is genuinely optional: many notifications (e.g. buyer messages) carry no navigable destination, so panel code must guard for `undefined`.
