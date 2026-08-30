# docs/modules/account.md

## Purpose

Documents the `account` domain module: the visitor's self-service identity surface (login, signup, profile editing, password reset, email verification, account deletion, session management, address book). It is a consumer-only module with no exports and no dependents.

## Key elements

- **Store `account`** (`store.ts`) — single Pinia/Vuex store. State: `sessions`, `addresses`. Getters: `profile`, `loading`. 21 actions covering auth lifecycle, profile CRUD, session revocation, address CRUD, and email verification.
- **8 screens** — `Login`, `Signup`, `PasswordResetRequest`, `PasswordResetConfirm`, `AccountDeleteConfirm`, `VerifyEmailConfirm`, `Profile`, `Logout`. Routes are locale-prefixed (`/:locale/…`).
- **18 API endpoints** under `/account/*` — each registered as a Zod response envelope in the manifest; deleting the folder disables contract validation.
- **Validation dependency** — all forms validate against `usersSchema` / `usersPasswordSchema` from the `users` barrel.
- **Components** — `ProfileAddresses.vue`, `ProfileSessions.vue` (domain-owned, no barrel export).
- **Locales** — `en.json`, `it.json`, each loaded as its own chunk.
- **Analytics** — emits `analyticsEvents.USER_LOGGED_OUT` (constant declared in the backend).
- **Navigation** — single menu entry: `Profile` (section `account`, order 70, icon).

## Relationships

- **→ `users`** — `published-language` edge: `account` imports validation schemas (`usersSchema`, `usersPasswordSchema`) from the `users` barrel. Shared field rules only; no shared store. On the backend the equivalent edge is `shared-kernel` (both modules write the same User record), but the frontend edge is strictly consumer-to-provider for validation vocabulary.
- **← `cart-checkout.md`** — listed as a graph neighbor but no interaction is documented in this file. The `ProfileAddresses` component is noted as publishable "when a sibling mounts it," which is the most likely coupling point, but no explicit import or dependency is stated here.
- **Session infrastructure** — the auth token lives in `infrastructure/session`, not in this module. `infrastructure/http` reads it per-request; router guards check `isAuth`/`isAdmin` before domain code runs.

## Notes

- **No `index.ts` / barrel.** Intentional: nothing outside the folder imports from this module. Adding a barrel would be a contract nobody has requested.
- **Session ≠ credential.** This module owns the *editable record* (profile, addresses, sessions list) but not the token. Do not move session storage here.
- **Backend counterpart** is `account` in `boilerplate-node-backend`; the server remains the single writer of the User record.
- **Subdomain is `generic`.** Treated as a solved problem; extra modelling effort is considered waste per the doc's own guidance.
- **Access control** is declared per-route via `meta.access` (`guest` / `public` / `auth`); menu entries never restate it.
