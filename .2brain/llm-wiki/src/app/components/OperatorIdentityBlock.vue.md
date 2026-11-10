---
source: src/app/components/OperatorIdentityBlock.vue
sha256: b05151649a128d31d181ef14c8cc6bc79a776f51d8157457842f931f7648abd9
signature: b3a1f40a2d8f0f8dcd77b4b6c68fec548eb7b5904ecb339da5b938e95913aaef
generated_at: 2026-11-10T02:52:46.920641+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/OperatorIdentityBlock.vue

## Purpose

Renders the site operator's legal identity (name, address, email, VAT, phone, trade register, registration number) as a definition list, satisfying e-Commerce Directive Art. 5 and GDPR Art. 13(1)(a). Intended for use on the Terms, Legal Notice, and Privacy pages. Renders nothing until the shared config has resolved, and works without a shop because it reads the core config only.

## Key elements

- **`operator`** (computed) — Reads `publicConfig.value?.operator`; returns `undefined` while the config is still unknown, which suppresses the entire `<dl>` via `v-if`.
- **`addressLine`** (computed) — Collapses the operator address into a single line via `formatAddressLine`, falling back to `''`.
- **`void loadConfig()`** — Triggers the config fetch (deduped against the boot-time load) so a directly-opened page still populates the block. `loadConfig` never rejects; it logs and leaves the config empty.
- **Template `<dl data-test="operator-identity">`** — Emits a static `DefinitionRow` for legal name, address, and email, then conditional rows for phone, VAT number, trade register, and registration number (each gated on the field being present).
- **Email link** — Wrapped in `<a href="mailto:…">` with an `underline` class.

## Relationships

No graph neighbors are registered for this file.

## Notes

- The `v-if="operator"` on the root `<dl>` means the component occupies zero space until the config arrives—no skeleton or placeholder is rendered.
- Optional fields (`phone`, `vatNumber`, `tradeRegister`, `registrationNumber`) are individually gated; a site with a minimal config will show only name, address, and email.
- The `eslint-disable` on the `loadConfig()` call is intentional: the function is fire-and-forget by design and never throws.
- Translation keys are namespaced under `operator-identity.*`.
