---
source: src/modules/api-keys/module.ts
sha256: 3b49ca2f4db5b52c628453a7283121771143c3829a50207a977354e5ad661caf
signature: 3b49ca2f4db5b52c628453a7283121771143c3829a50207a977354e5ad661caf
generated_at: 2026-11-10T03:49:29.230677+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/module.ts

## Purpose

Module manifest that registers the **api-keys** subdomain into the application's module registry. It wires the route table, the admin nav entry, lazily-loaded response schemas, and locale dictionaries together into a single `AppModule` object consumed by the kernel at boot.

## Key elements

- **Default export** – an object typed with `satisfies AppModule` containing:
  - `name: 'api-keys'` – registry key.
  - `loadingKeys: ['api-keys']` – keys the loader awaits before rendering.
  - `routes` – imported from `./routes` and passed straight to the router.
  - `navigation` – a single nav entry (`ApiKeysList`) placed in the `admin` section (order 51) with a `KeyRound` lucide icon; label is the i18n key `navigation.label-api-keys`.
  - `responseSchemas` – dynamic `import('./response-schemas')` returning `apiKeysResponseSchemas`.
  - `locales` – lazy loaders for `en` and `it` JSON files, each piped through the shared `dictionary` helper from `@/kernel/registry`.

## Relationships

- **`src/modules/api-keys/routes.ts`** – static import; the exported route array is assigned verbatim to the module's `routes` property, making it the sole source of API-keys URL mappings.

## Notes

- **Permission gating is rule-based, not role-based.** `meta.can` checks the server-published `apikeys.*` rules; today only the `admin` role holds them, so the nav entry and both routes vanish for every other user. The file itself contains no role strings.
- `satisfies AppModule` (not `: AppModule`) keeps the object literal's literal types (e.g. the exact `KeyRound` icon, the `plural: 2` number) while still enforcing the registry contract.
- Subdomain is `generic` (declared in the module doc comment); this file does not depend on any other module.
