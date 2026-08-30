# docs/modules/users.md

## Purpose

Admin-only user management: four screens (list, create, detail, edit) over a single `users` collection, plus the two published form schemas that the `account` module imports for validation. Classified as a `generic` subdomain — a solved CRUD problem that should not receive modelling effort.

## Key elements

- **`usersSchema` / `usersPasswordSchema`** — the module's only cross-module exports; Zod form schemas built on the *generated* request schemas (from `openapi.yaml`) so field rules cannot drift from the server.
- **Store `users`** (`store.ts`) — 5 state refs, 5 getters, 10 actions (`fetchUsers`, `createUser`, `updateUser`, `deleteUser`, `hardDeleteUser`, search, pagination, etc.).
- **4 admin screens** — `UsersList`, `UserCreate`, `UserTarget`, `UserEdit`; each is a thin view that reads the store and holds no fetching logic of its own.
- **`index.ts` (barrel)** — the sole surface a sibling module may import.
- **`module.ts` (manifest)** — the file the application loads directly; declares routes, nav entry, response schemas, locales, and dependency edges.
- **`response-schemas.ts`** — one Zod envelope per endpoint (9 total), registered so contract validation toggles with the domain.
- **`routes.ts`** — 4 route records, each carrying its own `meta.access: admin`.
- **Locales** — `en.json` and `it.json`, loaded as separate chunks.

## Relationships

- **→ `docs/theory/layers.md`** — The module's four view files cite that document as their architectural explanation; the views are the leaf layer that reads the store and renders, with no business logic.
- **← `account` module (sibling, not a graph neighbor here)** — `account` imports `usersSchema` and `usersPasswordSchema` from this module's barrel for form validation. The dependency is one-directional: `account → users`, never the reverse.

## Notes

- **Route order is deliberate.** `users/create` is declared before `users/:id` so a reader never has to reason about vue-router ranking.
- **All screens are `admin`.** Self-service actions (profile read, account deletion) live under `account`; the two modules never share a screen.
- **Schemas are generated, not hand-written.** They are derived from `openapi.yaml` request schemas; changing `schemas.ts` without regenerating will silently desync validation from the backend.
- **`meta.access` lives on the route, not the menu.** Menu entries reference the route name but never restate the access level, preventing menu/router drift.
- **Deleting `account` keeps this module fully functional; deleting this module leaves `account` with no schemas to validate against.**
