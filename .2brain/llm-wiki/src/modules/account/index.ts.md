---
source: src/modules/account/index.ts
sha256: 2b451f2b56ae9965335309c3c8e357813a7669dbe02e8fc18417b9dd79731f99
generated_at: 2026-10-02T12:15:43.423652+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/index.ts

## Purpose
Public barrel for the `account` module. It re-exports a single component (`AddressPicker`) so that other modules (notably `cart`'s checkout) can mount the address-choose UI without importing into this module's internal stores or add/edit dialog directly.

## Key elements
- **`AddressPicker`** — re-export of `./components/AddressPicker.vue` (default export, renamed to the named `AddressPicker`). This is the only public surface of the module.

## Relationships
- **`src/modules/account/components/AddressPicker.vue`** — the sole import source; this barrel is its only re-export point in the module. Consumers (e.g. `cart` checkout) import from this file rather than reaching into the component's path directly.

## Notes
- The JSDoc header explicitly positions this barrel as the *only* sanctioned entry point for external consumers. Importing `components/AddressPicker.vue` directly (or pulling in the module's stores) is considered reaching into module internals and should be avoided.
- The module currently exposes exactly one symbol; expect the barrel to grow if the account module adds more public APIs.
