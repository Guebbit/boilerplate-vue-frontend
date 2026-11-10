---
source: src/modules/notifications/composables/use-notification-link.ts
sha256: 2b2e15cd46b13dad625fdf0b6cbfa6d803752dc413456381c278c5897945abc2
signature: ba781337bc23873c22ba3819379029b6117a1f53867e32bc0dac53d5020711be
generated_at: 2026-11-10T04:48:09.243299+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/composables/use-notification-link.ts

## Purpose

A Vue composable that turns a `NoticeTarget` (either a named route or a raw path) into a locale-prefixed `RouteLocationRaw`, or `undefined` when the screen is not shipped in this build or the current session lacks permission to open it. It is the single resolution point so that no notification row can link to a page the reader would be refused.

## Key elements

- **`useNotificationLink`** (exported) — Call from `setup`. Returns a function `(target?: NoticeTarget) → RouteLocationRaw | undefined` that resolves and permission-checks a notice target.
- **`located`** (internal) — Maps a `NoticeTarget` to a locale-prefixed location string. Path targets go through `routerLinkI18n` + `router.resolve` (rejecting catch-all-only matches); named targets go through `linkIfRouted` (which enforces `hasRoute`).
- **Permission gate** — After resolution, the composable reads `meta.can` from the resolved route's record and queries `useSessionStore().can(…)`. If the session cannot satisfy the requirement, `undefined` is returned.

## Relationships

- **`src/modules/notifications/components/NotificationsBell.vue`** — Consumes `useNotificationLink` to decide whether each notification row renders as a clickable link or plain text.
- **`src/modules/notifications/tests/use-notification-link.spec.ts`** — Unit-tests the composable's resolution and permission paths.

## Notes

- Path targets are resolved using the **string** form (`routerLinkI18n(target.path)`) deliberately; a `{ path }` object would drop the query string.
- A path that matches only a catch-all route is treated as *unshipped* and yields `undefined`, preventing links to screens absent from the current build.
- The composable captures `router` and `session` once at call time (i.e., inside `setup`), so it is not safe to call outside a component context.
- `meta.can` is expected to be a tuple (`[subject, action]` or similar); only the first two elements are passed to `session.can`.
