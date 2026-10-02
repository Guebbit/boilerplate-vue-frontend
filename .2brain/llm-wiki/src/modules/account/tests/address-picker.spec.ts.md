---
source: src/modules/account/tests/address-picker.spec.ts
sha256: 167cde463acc6f5fdce078d45d79742f52b9bdcab9406970795cbd655b0bf8db
generated_at: 2026-10-02T14:48:34.619802+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/address-picker.spec.ts

## Purpose

Unit-test suite for `AddressPicker.vue` that validates the component's pre-select watcher (default/first-entry fallback, manual-pick preservation, store-reactive re-selection), the add-address-at-checkout flow, isolation between two simultaneously mounted pickers, and the billing-purpose variant (including the "same as shipping" standing choice).

## Key elements

- **`anAddress(overrides)`** – Factory returning a fully-populated `Address` fixture; tests spread overrides on top.
- **`mountPicker(addresses, modelValue?, extraProps?)`** – Seeds the `addresses` store, stubs `fetchAddresses`, then `mount`s `AddressPicker` with Vuetify + i18n plugins. Returns `{ store, wrapper }`.
- **`lastChosen(wrapper)`** – Reads the most recent `update:modelValue` emit (or `undefined` if the watcher never fired).
- **`describe('… pre-select watcher')`** – 5 tests: default selection, first-entry fallback, manual-pick guard, store-mutation reactivity, and the empty-book timing guard (must wait for the store to "answer" before clearing).
- **`describe('… adding a place at checkout')`** – 4 tests: add-button / empty-state visibility, selecting the just-added entry, and distinguishing a first-load from an explicit add.
- **`describe('… two pickers on one book')`** – 1 test: entries that appear in the store without a local add-dialog click are *not* auto-selected.
- **`describe('… the billing purpose')`** – 5 tests: distinct data-test IDs, "same as shipping" suppresses pre-select, pre-select when shipping isn't an option, fallback when `sameAsShipping` flips to `false`, and billing-specific empty-state copy.

## Relationships

- **`tests/support/unit/mounted-vm.ts`** – Supplies `nextRenderTick(wrapper)`, used after mutating `store.addresses` to let Vue's reactivity flush before asserting on emits.
- **`tests/support/unit/wire-modules.ts`** – Supplies `wireModulesIntoCore()`, called once at module top-level to register global module wiring (i18n locale plumbing, etc.) before any test block runs.

## Notes

- The suite reads the watcher's effect through the `update:modelValue` emit rather than observing a re-rendered prop, because Vue's `defineModel` needs a real two-way binding that a bare `mount` does not establish.
- `wireModulesIntoCore()` runs at module scope (not in `beforeEach`), so it executes exactly once for the whole file.
- `beforeEach` creates a fresh Pinia instance **and** calls `loadLocale('en')`; both are required for a clean mount.
- The "two pickers" and "adding a place" tests differentiate *local* add-dialog interaction (a click on `[data-test=address-picker-add]`) from a store mutation that simulates the *other* picker's add — only the former triggers auto-selection of the new entry.
