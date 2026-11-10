---
source: src/modules/delivery/components/ShippingMethodName.vue
sha256: 5997b7cc8c52bfa54e44c5c80540a003eab7b81f1ee8570db1e26724576c8666
signature: 53313e2bb45e82c8644456c737d4f424d2f9f10c84fb64f68dcb629714f68032
generated_at: 2026-11-10T04:16:53.431594+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShippingMethodName.vue

## Purpose

Renders a human-readable display name for a shipping method by translating its stable ID (e.g. `standard` → "Standard") via i18n. It exists as the single point through which any order-facing UI shows a method name, so that a raw ID never reaches the end user. If no translation is registered for the current deployment, it falls back to displaying the ID itself.

## Key elements

- **`id` (prop, `string`)** — The shipping method identifier exactly as the order stores it.
- **`name` (computed)** — Builds the i18n key `shipping-selector.method-${id}`, checks existence with `i18n.te()`, and returns the translated string or the raw `id` as a fallback.
- **Template** — A single `<span data-test="shipping-method-name">` that outputs `name`. The `data-test` attribute is the stable hook for e2e tests.

## Relationships

- **`src/modules/delivery/index.ts`** — The delivery module's barrel file re-exports this component, making it available to consumers importing from the delivery module rather than reaching into `components/` directly.

## Notes

- Translation keys follow the fixed prefix `shipping-selector.method-` concatenated with the prop value. Adding a new shipping method requires a matching key in the i18n locale files; otherwise the raw ID is shown (intentional, not an error).
- The component is intentionally stateless and has no local reactivity beyond the `computed`—it is safe to render many times per page without side effects.
- The `data-test` attribute is part of the public test contract; renaming or removing it will break existing e2e selectors.
