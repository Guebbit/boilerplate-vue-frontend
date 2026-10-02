---
source: src/modules/account/module.ts
sha256: 7cc5f278e8fc4f39b3761085f2fe7e64a61ef132342fea001b3a64f043672ae9
generated_at: 2026-10-02T12:16:01.200025+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/module.ts

## Purpose

Module manifest for the `account` module. Exports a single default object (typed as `AppModule`) that, once spliced into the kernel registry by name, activates the account routes, navigation entry, response-schema loader, and locale loaders. It is the registration point, not the implementation.

## Key elements

- **`default` export** — A `satisfies AppModule` object containing:
  - `name: 'account'` — registry key.
  - `loadingKeys: ['account']` — keys the loader awaits before the module is considered ready.
  - `routes` — imported from `./routes.ts`; the route table for login, signup, profile, password reset, and account deletion.
  - `navigation` — a single nav entry ("Profile", section `account`, order 70, `IdCard` icon).
  - `responseSchemas` — lazy `import('./response-schemas')` returning `accountResponseSchemas`.
  - `locales` — lazy imports of `en.json` / `it.json`, each piped through the shared `dictionary` helper from `@/kernel/registry`.

## Relationships

- **`src/modules/account/routes.ts`** — Imported statically and assigned to the manifest's `routes` field. All account screens (login, signup, profile, reset, deletion) are defined there; this file only passes them through to the kernel.

## Notes

- Form validation rules come from the `users` module (`usersSchema` / `usersPasswordSchema`), not from here. A build with `account` enabled but `users` disabled would have no field rules to validate against.
- Session/token management is **not** in this module; it lives in `infrastructure/session` so that `infrastructure/http` and router guards can read it before any domain code executes.
- `index.ts` in this directory re-exports exactly one component (`AddressPicker`) so `cart`'s checkout can mount address selection without reaching into account stores or dialogs.
- The module is intentionally thin on the client side: it renders forms over server-owned rules; there is no competitive logic here.
