---
source: src/modules/webhooks/domain/subscription-status.ts
sha256: 96b308f4b074134ce3345e99e8504bfe4094871b5aaabb0d6e23a23792435f97
signature: dc48adb9a9e08fdc09e66605adc7c2070cf4094eaa0661472ea769d21db72608
generated_at: 2026-11-10T06:12:43.181887+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/domain/subscription-status.ts

## Purpose

Single source of truth for a webhook subscription's three delivery states (`enabled`, `paused`, `auto-disabled`). The server persists two timestamps and a derived `enabled` flag; this file turns those wire fields into the three states the UI must distinguish, and provides the mapping between a status and the two boolean query filters the server accepts.

## Key elements

- **`SubscriptionStatus`** (type) — union `'enabled' | 'paused' | 'auto-disabled'`.
- **`subscriptionStatusOf(subscription)`** — pure function; given `enabled` + `autoDisabledAt` returns the three-state status. `enabled` wins; otherwise `autoDisabledAt` present → `auto-disabled`, else `paused`.
- **`SubscriptionStatusFilter`** (interface) — the two optional booleans the server filter accepts: `enabled?`, `autoDisabled?`.
- **`filterOfStatus(status)`** — maps a `SubscriptionStatus` (or `undefined` for "any") to a `SubscriptionStatusFilter` object.
- **`statusOfFilter(filter)`** — inverse of `filterOfStatus`; returns the matching status or `undefined` when the filter does not pin down exactly one state.

## Relationships

- **`SubscriptionStatusChip.vue`** — consumes `SubscriptionStatus` and `subscriptionStatusOf` to render the per-subscription status badge.
- **`WebhookTarget.vue`** — calls `subscriptionStatusOf` to display the target's current delivery state.
- **`WebhooksList.vue`** — uses `filterOfStatus` / `statusOfFilter` to sync the URL query parameters with the server-side filter booleans when the user picks a status tab.
- **`subscription-status.spec.ts`** — unit tests covering the derivation and round-trip mappings above.

## Notes

- The file is pure logic (no DOM, no store imports); it depends only on the `WebhookSubscription` type from `@types`.
- `subscriptionStatusOf` accepts a `Pick<WebhookSubscription, 'enabled' | 'autoDisabledAt'>`, so callers need not pass the full object.
- `statusOfFilter` deliberately returns `undefined` when the filter fields don't resolve to exactly one status (e.g. both unset), rather than guessing — callers must handle the `undefined` case.
- "Paused" and "auto-disabled" are both `enabled: false` on the wire; the only discriminator is whether `autoDisabledAt` is set. The entire purpose of this module is keeping that distinction in one place.
