---
source: src/infrastructure/utils/address-limits.ts
sha256: dcef6949dc3f0c3a95bf9eaa38f1a5b60e7591c3973f2a6d33578242591a6b5d
signature: 70fa36c15d90219e336244929ac573adfca271f5b281f6c939f393fd614b0eed
generated_at: 2026-11-10T03:10:44.609601+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/address-limits.ts

## Purpose

Provides a single, neutral import path for address-field max-length constants. It exists so that `.vue` view files— which cannot import the `@api` package directly—can still read the same limits the API enforces on `CreateAddressRequest` fields.

## Key elements

- **`ADDRESS_MAX`** (`as const` object) — Maps each address field (`label`, `fullName`, `street`, `city`, `zip`, `phone`) to its API-enforced maximum length, sourced from the `createAddressBody*Max` exports in `@api/schemas`. This is the sole public export of the module.

## Relationships

No graph neighbors. The module has no imports beyond `@api/schemas` and is itself a leaf utility consumed by view-layer validation code.

## Notes

- The file exists solely as an indirection layer. If the `@api` restriction on `.vue` files is lifted, this module becomes redundant.
- All six values are re-exported by reference (no computation), so they always track the API's OpenAPI-derived constants.
- The `as const` assertion means downstream code sees literal types (e.g. `128`) rather than `number`, enabling type-level comparisons in validators.
