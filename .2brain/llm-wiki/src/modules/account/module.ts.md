---
source: src/modules/account/module.ts
sha256: 654e8adc54d3026bce67f3ae7830c833c0c59154b1b665051728a3491c8ab02b
signature: 654e8adc54d3026bce67f3ae7830c833c0c59154b1b665051728a3491c8ab02b
generated_at: 2026-11-10T03:24:52.966902+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/module.ts

## Purpose

Module manifest for the `account` domain (login, signup, profile, password reset, account deletion). It declares the routes, navigation entry, response schemas, and locale loaders that make up "having the account module enabled" in the kernel registry. It does not own the session token or auth guards — those live in `infrastructure/session`.

## Key elements

- **`export default { … } satisfies AppModule`** — the sole export. A plain object registered by name (`'account'`) with:
  - `name` — module identifier used by the kernel.
  - `loadingKeys` — `['account']`; keys the loader awaits before routes are considered ready.
  - `routes` — re-exported from `./routes.ts`.
  - `navigation` — a single nav entry ("Profile", section `account`, order 70, `IdCard` icon) rendered in the app's navigation.
  - `responseSchemas` — lazy import of `./response-schemas` → `accountResponseSchemas`.
  - `locales` — lazy loaders for `en` and `it` JSON files, each passed through the shared `dictionary` helper from `@/kernel/registry`.

## Relationships

- **`src/modules/account/routes.ts`** — imported directly and passed as the `routes` field. The manifest is the registration point; `routes.ts` holds the actual route definitions and page components.
- **`@/kernel/registry`** — provides the `AppModule` type (shape contract) and the `dictionary` helper (locale normalization). The kernel splices this object into its module registry by `name`.
- **`users` module (referenced in doc comment)** — `account`'s forms validate against `usersSchema` / `usersPasswordSchema` from the users barrel so field rules are defined once. No direct import in this file.
- **`infrastructure/session` (referenced in doc comment)** — owns the auth token and `isAuth` guard logic that runs before any `account` route renders.

## Notes

- The file is a *manifest*, not an entry point. It registers metadata; it contains no runtime logic beyond lazy import thunks.
- `index.ts` (sibling file) re-exports `AddressPicker` so `cart`'s checkout can mount address selection without reaching into `account`'s stores or dialogs. That export is **not** declared in this manifest.
- Subdomain tag is `generic` — the comment notes there is no competitive differentiation here and the client half is thin (renders forms over server-owned rules).
- `plural: 2` on the nav entry controls how the nav label pluralises (presumably "Profile" vs. "Profiles" in a multi-account context).
