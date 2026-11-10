---
source: src/modules/webhooks/tests/subscription-status.spec.ts
sha256: 56d8d5499a5e5d90291403fdbf8bf3c2ad2942622324b2deefc51379de5d9ba6
signature: 56d8d5499a5e5d90291403fdbf8bf3c2ad2942622324b2deefc51379de5d9ba6
generated_at: 2026-11-10T06:16:08.311461+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/subscription-status.spec.ts

## Purpose
Vitest spec that locks in the three-way status discriminator (`enabled` / `paused` / `auto-disabled`) and the bidirectional filter mapping exposed by the `subscription-status` domain module. It exists so that the subtle priority rule — `enabled: true` wins regardless of `autoDisabledAt` — and the filter round-trip contract are both enforced at test time.

## Key elements
- **`describe('subscriptionStatusOf')`** — Table-driven tests over `subscriptionStatusOf`, asserting the three statuses from field shapes and explicitly asserting that `enabled: true` + a set `autoDisabledAt` still yields `'enabled'`.
- **`describe('the status filter')`** — Round-trip tests for `filterOfStatus` → `statusOfFilter` across `undefined`, `'enabled'`, `'paused'`, and `'auto-disabled'`; plus two edge-case tests: a filter that selects no single status resolves to `undefined`, and `{ enabled: false }` alone (no `autoDisabled` key) resolves to `'paused'`.

## Relationships
- **`src/modules/webhooks/domain/subscription-status.ts`** — The sole subject under test. This spec imports `subscriptionStatusOf`, `filterOfStatus`, `statusOfFilter`, and the `SubscriptionStatus` type from that module and asserts their behavior. No other graph neighbor is touched.

## Notes
- The priority rule is deliberately pinned: `enabled` is the source of truth; `autoDisabledAt` only downgrades a *disabled* subscription to `auto-disabled`. If the domain logic ever inverts that, this spec is the tripwire.
- `statusOfFilter` is intentionally non-injective: multiple filter objects (e.g. `{}`, `{ autoDisabled: false }`) map to `undefined` ("any"). Tests encode that `undefined` is a valid, meaningful return, not an error.
- The filter for `paused` is `{ enabled: false, autoDisabled: false }`, whereas `auto-disabled` adds `autoDisabled: true`. The distinction is the `autoDisabled` flag, not a separate field on the subscription record.
