---
source: src/modules/delivery/components/ShippingMethodName.vue
sha256: 5997b7cc8c52bfa54e44c5c80540a003eab7b81f1ee8570db1e26724576c8666
generated_at: 2026-10-17T00:47:25.114368+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShippingMethodName.vue

## Purpose

A presentational component that renders a shipping method's human-readable name by resolving its stable id (e.g. `standard`) through i18n. It exists so that any UI surface displaying a frozen shipping-method id to a person goes through a single translation lookup with a safe fallback, rather than printing the raw key.

## Key elements

- **`id` (prop, `string`)** – The shipping method identifier as stored on the order.
- **`name` (computed)** – Resolves `shipping-selector.method-${id}` via `i18n.t`; returns the raw `id` when `i18n.te` reports no translation for that key.
- **Template** – A single `<span data-test="shipping-method-name">` element rendering `name`.

## Relationships

- **`src/modules/delivery/index.ts`** – The delivery module's barrel file; this component is re-exported from it so consumers import from the module root rather than the component path directly.

## Notes

- Translation keys follow the pattern `shipping-selector.method-{id}`. If a new shipping method id is added without a matching locale entry, the component silently shows the id string itself (no error, no blank).
- The `data-test="shipping-method-name"` attribute is the stable hook for e2e assertions on the rendered name.
- The component is purely presentational: it does no fetching, mutation, or business logic.
