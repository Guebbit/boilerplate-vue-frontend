---
source: src/modules/users/composables/use-role-options.ts
sha256: 30b8116654fd432700a9fb2b23dd9a79328b7ba9f8bb4081c85bfd9104931686
signature: 06fe1e52168889d76dc440ec43819334d003473eb84849af84aa4b35dedcfc3e
generated_at: 2026-11-10T06:03:44.024773+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/composables/use-role-options.ts

## Purpose

Provides the list of selectable role options for any role `<select>` in the users module. The options are derived from the server-authorized `grantableRoles` (published via `GET /account` abilities and stored in the session), so the picker offers exactly the roles a write would accept rather than a hard-coded enum that could drift from the backend.

## Key elements

- **`RoleOption`** (interface) — `{ value: string; title: string }`; a single `v-select` item. `value` and `title` are the same raw role name because roles are server-defined data, not a local enum.
- **`useRoleOptions`** (composable, default export of the file) — returns:
  - `grantableRoles()` — a getter for `session.grantableRoles` (the names the signed-in caller may assign; may be empty).
  - `roleOptions(currentRole?)` — builds the ordered `RoleOption[]` for a select: the translated "no staff role" option (empty string value) first, then every grantable role, plus the target account's current role if it would otherwise be absent (so the select can still display a value the caller cannot assign).

## Relationships

- **Consumed by** `UserAccessDialog.vue`, `UserCreate.vue`, and `UserEdit.vue` — each calls `useRoleOptions()` to populate its role `<select>` and uses `grantableRoles` for permission checks.

## Notes

- The empty-string option (`value: ''`) is the only translated entry; all other options use the raw role name as both value and title. Do not add i18n keys per role.
- `roleOptions` accepts an optional `currentRole` to back-fill the edited user's existing role into the list. Omitting it (e.g. on the create form) is valid.
- The composable is intentionally dependency-free beyond the session store and i18n; there is no local role list or enum in this repo.
