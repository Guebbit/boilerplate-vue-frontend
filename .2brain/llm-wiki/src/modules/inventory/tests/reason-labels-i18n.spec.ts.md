---
source: src/modules/inventory/tests/reason-labels-i18n.spec.ts
sha256: b7bfe627179e54dcb74364d668e751a3dbb39a8252ae7c303fdd0a400dc5cead
generated_at: 2026-10-02T15:10:02.015635+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/reason-labels-i18n.spec.ts

## Purpose

Guarantees that every value in the `StockMovementReason` enum has a corresponding `inventory-page.reason-*` i18n label in both supported locales. Without this, `MovementLedger.vue`'s filter dropdown and ledger rows would render the raw enum key instead of a human-readable word (a regression that previously shipped with `restock`).

## Key elements

- **`setLocale(locale)`** — Local helper that calls `loadLocale` and then `nextTick()`, returning a promise that resolves once the locale switch is reactive.
- **`describe('inventory reason labels')`** — Single test block. `beforeAll` wires the i18n core via `wireModulesIntoCore()` and sets locale to `'en'`; `afterEach` resets to `'en'`.
- **`it.each(['en', 'it'])`** — For each locale, iterates every value in `Object.values(StockMovementReason)`, constructs the key `inventory-page.reason-${reason}`, and asserts `i18n.global.t(key) !== key` (i.e. the key was actually translated).

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called in `beforeAll` to register the real vue-i18n instance against the app core so the test runs against production i18n wiring rather than a mock.
- **`@/i18n`** (`loadLocale`, `i18n`) — The module under test; the test exercises its real resolution behavior.
- **`@api`** (`StockMovementReason`) — The enum whose values enumerate the required label keys.
- **`MovementLedger.vue`** (consumer, referenced in the module doc comment) — The component whose filter and row rendering depends on the label pattern this test pins.

## Notes

- The assertion `expect(i18n.global.t(key)).not.toBe(key)` exploits vue-i18n's fallback behavior: a missing key resolves to the key string itself. This is the exact symptom the test guards against.
- `setLocale` must be awaited (or chained) before any `t()` call in the same tick; the test threads it through `.then()` rather than using `await` inside the `it.each` callback to keep the synchronous `for` loop inside a single microtask.
- The test intentionally uses the **real** i18n instance (via `wireModulesIntoCore`) rather than a stub, so it catches missing keys in the actual locale JSON files.
