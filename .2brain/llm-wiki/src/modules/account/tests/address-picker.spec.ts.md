---
source: src/modules/account/tests/address-picker.spec.ts
sha256: c3fc3f2dd9c289cbb79d08f6e95b9fb53136b6a5170494155a88c1d3aa9ca43a
generated_at: 2026-10-17T00:20:21.201352+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/address-picker.spec.ts

## Purpose

Unit tests for `AddressPicker.vue`'s pre-select watcher and related UI behavior. Verifies that the watcher picks a default (or first) entry when nothing valid is chosen, never overrides a still-valid manual pick, and correctly distinguishes a freshly added entry from the initial book load.

## Key elements

- **`anAddress(overrides?)`** – Factory returning a fully-populated `Address` object with sensible defaults; spread-override any field.
- **`mountPicker(addresses, modelValue?, extraProps?)`** – Seeds the Pinia address store, stubs `fetchAddresses` to avoid race conditions, and mounts `AddressPicker` with Vuetify + i18n plugins. Returns `{ store, wrapper }`.
- **`lastChosen(wrapper)`** – Reads the most recent `update:modelValue` emit (or `undefined` if never emitted) to observe what id the watcher settled on.
- **`describe('the pre-select watcher')`** – Core logic tests: default pick, first-entry fallback, guard against overriding a valid manual choice, fallback when the chosen entry is removed, and the "wait for fetch to answer" empty-book case.
- **`describe('adding a place at checkout')`** – Verifies add-button visibility, that a locally-added entry is auto-selected, and that the initial store load is not mistaken for an add.
- **`describe('two pickers on one book')`** – Confirms that an entry added via *another* picker's dialog is ignored by this picker's watcher.
- **`describe('the billing purpose')`** – Tests billing-specific test IDs, the "same as shipping" standing choice, pre-select suppression while `sameAsShipping` is true, fallback when it flips to false, and empty-book messaging.

## Relationships

- **`src/modules/account/components/AddressPicker.vue`** – The SUT under test; mounted via `mountPicker`.
- **`src/modules/account/stores/addresses.ts`** – Provides `useAddressesStore`; tests seed `store.addresses` directly and spy on `fetchAddresses` to simulate async loads.
- **`tests/support/unit/mounted-vm.ts`** – Supplies `nextRenderTick`, used to flush Vue's render queue before asserting post-mutation state.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register global module aliases so `@/i18n` and `@/ui/vuetify` resolve correctly in the Vitest environment.

## Notes

- `defineModel` two-way binding is **not** wired up by a bare `mount`; the tests therefore read the watcher's effect off `emitted('update:modelValue')` rather than asserting on a re-rendered prop. This is intentional and documented in the `mountPicker` JSDoc.
- Mutation of `store.addresses` after mount simulates list changes (deletion, addition). The tests rely on the watcher observing the **store** (not a prop), so a stale local copy would fail the "chosen entry vanishes" test.
- `beforeEach` creates a fresh Pinia instance and loads the `en` locale; no test isolation helper beyond that is used.
- The `void` before `wrapper.get(...).trigger('click')` in the "chooses the entry the visitor just added" test suppresses an unhandled-promise lint warning; the actual assertion is async via `nextRenderTick`.
