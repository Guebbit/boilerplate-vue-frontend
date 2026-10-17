---
source: src/modules/users/composables/use-role-options.ts
sha256: 41d45c1ac4fec88af40ef73065a2ae63921c60014eba5264b51ac9ae21120321
generated_at: 2026-10-17T01:45:44.749045+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/composables/use-role-options.ts

## Purpose

Provides the select options for every role picker in the users module. It reads the list of roles the signed-in caller is permitted to assign (sourced from `GET /account/abilities` via the session store) and shapes them into `v-select` items, ensuring the picker never offers a role the server would reject with `409`.

## Key elements

- **`RoleOption`** (interface) — Shape of a single select option: `{ value: string; title: string }`. For roles, `value` and `title` are the same raw server-assigned name; only the empty-value option is translated.
- **`useRoleOptions()`** (composable) — Returns:
  - `grantableRoles` — a getter returning `session.grantableRoles` (the names the caller may assign).
  - `roleOptions(currentRole?: string)` — builds the ordered `RoleOption[]` for a `v-select`: the translated "no staff role" entry first, then the deduplicated union of grantable roles and the target account's current role (so the select can display a value the caller cannot themselves assign).

## Relationships

- **UserAccessDialog.vue** — Consumes `useRoleOptions` to populate its role `<v-select>` when changing an existing user's access.
- **UserCreate.vue** — Calls `useRoleOptions` to present assignable roles during account creation (no `currentRole` passed).
- **UserEdit.vue** — Calls `useRoleOptions` passing the account's current role so the edit form can still render it even if the caller lacks permission to re-assign it.

All three rely on the composable rather than accessing the session store directly, keeping the "include current role for display" logic in one place.

## Notes

- Role names are **not** translated; they are opaque deployment-specific strings. Only the empty-value option (`''`) uses i18n (`user-access-dialog.role-none`).
- The composable depends on `useSessionStore` for `grantableRoles` — if the session has not yet hydrated from `GET /account/abilities`, the list will be empty and the select will show only the "no staff role" entry.
- `currentRole` is added to a `Set` alongside `grantableRoles`, so it appears exactly once even if it is also grantable.
