---
source: src/modules/webhooks/tests/routes.spec.ts
sha256: 5f0b0ed42a5a594f364411a76a7b72a7fcca828f7f48425fc616655826b0500f
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T06:15:00.046922+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/routes.spec.ts

## Purpose

Pins the `meta.access` and `meta.can` values every webhooks route declares, by name. It verifies the access *declarations* are present on the route records themselves (complementary to the router spec, which proves enforcement is *attached*). It runs standalone against the raw route array—no router, no locale prefix, no app.

## Key elements

- **`byName(name)`** – local helper; finds a `RouteRecordRaw` in the imported `routes` array by its `name` property.
- **`it.each` table (5 routes)** – asserts, for each named route (`WebhooksList`, `WebhookCreate`, `WebhookTarget`, `WebhookEdit`, `WebhookDeliveries`), that `meta.access` is `'auth'` and `meta.can` matches the expected `[action, subject]` tuple.
- **Completeness test** (`declares no route this file does not know about`) – asserts the *set* of route names in the imported `routes` array exactly equals the five names listed above, catching any new route added without an access decision.

## Relationships

- **`src/modules/webhooks/routes.ts`** – the sole SUT. This spec imports its default export (the route array) and inspects each record's `meta` field. No mocking; no router construction.

## Notes

- Access is tested **by route name**, not by path, so locale-prefixed URLs are irrelevant.
- `meta.access` is expected to be the string `'auth'`; `meta.can` is an array `[action, subject]` (e.g. `['read', 'WebhookSubscription']`). Adding a new route without a `meta.access` entry will fail the completeness test, not the per-route assertions.
- The file intentionally does **not** test that the router *enforces* the access policy—that responsibility belongs to the router-level spec.
