---
source: src/modules/account/tests/address-picker.spec.ts
sha256: 148909829d93cfa52d80589a54e34482fe3ab19e937ae38fd5a55df32ec19722
signature: d9bd75ac4c361e033138c65d070aee4a85de72a1c4455c70f85e7b5e7d784dfc
generated_at: 2026-11-10T03:29:28.757622+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/address-picker.spec.ts

## Purpose

Vitest unit-test suite for the `AddressPicker.vue` component, focused on its pre-select watcher (default/first-entry fallback logic), the checkout add-address flow, isolation between two pickers sharing one store, and the billing-purpose variant. It exists to pin down the component's reactive contract without rendering the full app shell.

## Key elements

- **`anAddress(overrides?)`** – factory that returns a fully-populated `Address` object with any field overridden.
- **`mountPicker(addresses, modelValue?, extraProps?)`** – seeds the Pinia address store, stubs `fetchAddresses`, mounts `AddressPicker` with Vuetify + i18n plugins, and returns `{ store, wrapper }`.
- **`lastChosen(wrapper)`** – reads the most recent `update:modelValue` emission (or `undefined` if the watcher never fired).
- **`describe('AddressPicker — the pre-select watcher')`** – covers default-preselect, first-entry fallback, manual-choice preservation, and re-selection when the chosen entry is removed from the store.
- **`describe('AddressPicker — adding a place at checkout')`** – verifies the add-button / empty-state UI and that a locally-added entry is auto-selected while an initial load is not mistaken for an add.
- **`describe('AddressPicker — two pickers on one book')`** – confirms that a store change originating outside this picker does not trigger a selection.
- **`describe('AddressPicker — the billing purpose')`** – validates billing-specific test-ids, the "same as shipping" standing choice, and the fallback to default-entry pre-select when that option is removed.

## Relationships

- **`src/modules/account/components/AddressPicker.vue`** – the component under test; all assertions target its DOM, emissions, and watcher behavior.
- **`src/modules/account/stores/addresses.ts`** – `useAccountAddressesStore` is instantiated per test, seeded with fixture data, and mutated mid-test to drive reactive updates.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module top-level to register side-effects the component expects.
- **`tests/support/unit/mounted-vm.ts`** – provides `nextRenderTick(wrapper)` used after store mutations to flush Vue's reactivity before asserting.

## Notes

- `wireModulesIntoCore()` runs as a top-level side effect; importing this spec file in isolation triggers it.
- `mountPicker` stubs `store.fetchAddresses` so the component's initial async read never races the test assertions.
- Selection is observed via the `update:modelValue` emission rather than the prop itself, because a bare `mount` does not wire up `defineModel`'s two-way binding — this is intentional and noted in the helper's JSDoc.
- Tests that mutate `store.addresses` after mount (e.g. "falls back once the chosen entry vanishes") rely on the watcher reading the **store**, not a stale local prop copy; this is an explicit design assertion in the test comments.
- The "two pickers" test distinguishes a local add (triggered by this picker's own `[data-test=address-picker-add]` click) from a store-level change made externally — only the former should trigger auto-selection.
- `loadLocale('en')` is awaited in `beforeEach`; i18n must be ready before the component renders localized strings.
