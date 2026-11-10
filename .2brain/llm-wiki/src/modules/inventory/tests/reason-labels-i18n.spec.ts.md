---
source: src/modules/inventory/tests/reason-labels-i18n.spec.ts
sha256: b7bfe627179e54dcb74364d668e751a3dbb39a8252ae7c303fdd0a400dc5cead
signature: ee029fa35f31355677160b1587b053ced0412f8048bd740931be11e09ed7e65f
generated_at: 2026-11-10T04:35:23.035359+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/reason-labels-i18n.spec.ts

## Purpose

Guarantees that every `StockMovementReason` enum value has a corresponding `inventory-page.reason-*` i18n label in both supported locales (`en`, `it`). It exists because a missing label (e.g. `restock`) caused `MovementLedger.vue` to render the raw key instead of a human-readable word in both the filter and ledger rows.

## Key elements

- **`setLocale(locale)`** – Loads the given locale via `loadLocale` and waits one `nextTick` so DOM-facing reactivity settles before assertions run.
- **`beforeAll`** – Calls `wireModulesIntoCore()` to register modules, then sets the initial locale to `en`.
- **`afterEach`** – Resets the active locale back to `en`.
- **`it.each(['en', 'it'])`** – For every value in `StockMovementReason`, asserts that `i18n.global.t('inventory-page.reason-<value>')` does **not** equal the key itself (i.e. a real translation exists).

## Relationships

- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore`, which registers the module inventory so the real i18n instance can resolve `inventory-page.*` keys. Without this call the keys would be unregistered and the test would fail for the wrong reason.
- **`@/i18n`** – Supplies the live `i18n` instance and `loadLocale` helper; the test asserts against real vue-i18n resolution, not a mock.
- **`@api`** – Source of the `StockMovementReason` enum that drives the loop.

## Notes

- The guard exploits vue-i18n's fallback behavior: a missing key resolves to the key string itself. The assertion `.not.toBe(key)` is the entire check — no mock or spy is used.
- The key pattern (`inventory-page.reason-${reason}`) must stay in lockstep with whatever `MovementLedger.vue` interpolates. Renaming the enum value or the i18n key on either side will break the UI silently before this test catches it.
- Tests run against the **real** i18n instance (no `createI18n` mock), which is why `wireModulesIntoCore` is mandatory in `beforeAll`.
