---
source: src/modules/observability/audit-target.ts
sha256: dac59970d9baedf5c35d96f191eab01d6c4e9119d4a7c9e2dc0ade2a53d00da9
signature: 562469c6d5670453ed15f40daf5fe13c25c210d4e8ccfa8958f5619356cfff48
generated_at: 2026-11-10T04:50:50.357843+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/audit-target.ts

## Purpose

Maps an audit-log row's target (type + id) to the detail-page route for that record, if this build ships one. Also provides a helper to shorten target ids for table-cell display.

## Key elements

- **`shortTargetId(id: string): string`** — Truncates a target id to its first 8 characters for display in a table cell. The full id is still available in the link's accessible name and in the target filter.
- **`auditTargetLocation(router, targetType?, targetId?): RouteLocationRaw | undefined`** — Resolves the detail-page location for a given `targetType`/`targetId` pair. Returns `undefined` when there is no target id, when the type has no dedicated page (e.g. API key, locale, session), or when the build does not include that module's route. Supports `order`, `user`, `product`, and `webhook_subscription`.
- Uses **`linkIfRouted`** (from `@/kernel/route-link.ts`) to guard each route name, so a missing route degrades gracefully to `undefined` rather than producing a broken link.

## Relationships

- **`AdminAuditTab.vue`** — The primary consumer; calls `shortTargetId` for cell display and `auditTargetLocation` to render the clickable link to the target's detail page.
- **`audit-target.spec.ts`** — Unit tests covering the truncation logic and the route-resolution table (including the `undefined` fallbacks).

## Notes

- The switch is intentionally exhaustive-by-case: adding a new target type requires adding a `case` here *and* registering the corresponding `…Target` route name in the router. Types without a case silently fall through to plain text (no link), which is the desired behavior for types like API keys or sessions.
- `auditTargetLocation` accepts a minimal structural type (`{ hasRoute }`) rather than the full Vue `Router`, keeping the module decoupled from a concrete router instance.
- Route names follow the `<Entity>Target` convention (e.g. `OrderTarget`, `WebhookTarget`) — a single shared suffix that distinguishes audit-target routes from other same-entity routes in the app.
