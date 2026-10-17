---
source: src/modules/notifications/domain/index.ts
sha256: 8d39592689cde942b2d099da393e9e1236db0aa75001eb65fa540aba74ad4516
generated_at: 2026-10-17T01:08:43.848800+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/domain/index.ts

## Purpose

Barrel (public entry point) for the notifications domain layer. It re-exports the pure, framework-free rule functions and types defined in `./describe` so that callers import from a single canonical path. The module doc comment states it is lint-guaranteed free of Vue, Pinia, axios, and all other tiers.

## Key elements

- **`describeNotification`** (re-exported from `./describe`) — builds the human-readable text for a notification.
- **`notificationOrderId`** (re-exported from `./describe`) — extracts/derives an order identifier from a notification.
- **`productName`** (re-exported from `./describe`) — extracts/derives a product name from a notification.
- **`DescribableNotification`** (type, re-exported) — the notification shape that the describe functions operate on.
- **`FormatDate`** (type, re-exported) — function signature for date formatting passed into the domain.
- **`Translate`** (type, re-exported) — function signature for i18n translation passed into the domain.

## Relationships

- **`src/modules/notifications/domain/describe.ts`** — sole implementation source; every export in this file is a pure re-export from it.
- **`src/modules/notifications/store.ts`** — the application-tier store that consumes the domain; expected to import from this barrel rather than reaching into `./describe` directly.
- **`src/modules/notifications/tests/describe.spec.ts`** — unit tests for the describe logic; may import from this barrel to exercise the public API.

## Notes

- This file contains **no logic** — it is purely a re-export barrel. Any behavioral change belongs in `./describe`.
- The `FormatDate` and `Translate` types are dependency-injected signatures: the domain receives them as parameters rather than importing a concrete i18n or date library, preserving the "no external tiers" invariant.
- Callers should import from this barrel (`domain/index`) instead of deep-linking to `./describe` to keep the public surface explicit.
