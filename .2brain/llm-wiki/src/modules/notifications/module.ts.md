---
source: src/modules/notifications/module.ts
sha256: 5ccce9d76a2a0a72a5f254640eb30e3b3e53f9fbf1b1bd068a1bcce95233e7a1
signature: 5ccce9d76a2a0a72a5f254640eb30e3b3e53f9fbf1b1bd068a1bcce95233e7a1
generated_at: 2026-11-10T04:48:15.938072+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/module.ts

## Purpose

Module manifest for the notifications subdomain (`supporting`). Declares no routes and no menu entry; its sole UI surface is a lazily-loaded bell component mounted into the shell's `app-bar` slot. It also registers the module's response schemas, locale loaders, and foundation notices in the app registry.

## Key elements

- **Default export** (`satisfies AppModule`): the manifest object the registry consumes.
  - `name`: `'notifications'` — registry key.
  - `routes`: empty array; the module owns no pages.
  - `notices`: re-exports `foundationNotices` from `./notices`.
  - `responseSchemas`: lazy import of `./response-schemas` → `notificationsResponseSchemas`.
  - `locales`: per-locale lazy imports (`en`, `it`) passed through `dictionary` from `@/kernel/registry`.
  - `slots['app-bar']`: `defineAsyncComponent` wrapping `./components/NotificationsBell.vue`, keeping the bell and its store out of the eager entry chunk.

## Relationships

- **`src/modules/notifications/notices.ts`** — imports `foundationNotices` and attaches it to the manifest's `notices` field. This is the only file this module imports outside the kernel registry.

## Notes

- The module is strictly a read/render consumer: the server writes notifications (e.g., cart/wishlist changes, guest-cart merge rejections) and pushes them over SSE; this module never produces one. No sibling module imports or is imported by it.
- Deleting the module removes a user-facing message surface but no functional capability.
- Full narrative context lives in `docs/modules/notifications.md` § "The map".
