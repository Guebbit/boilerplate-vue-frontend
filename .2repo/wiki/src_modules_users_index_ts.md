# src/modules/users/index.ts

## Purpose

Barrel file (public entry point) for the `users` module. It exposes exactly two schema exports so that sibling modules (notably `account`) can validate login, signup, and password-reset forms against the same field rules without re-typing them. It deliberately omits the store: on the client neither module writes data — the API does — so what is shared is vocabulary, not a shared kernel.

## Key elements

- **`usersSchema`** (re-exported from `./schemas`) — field-level validation schema for user records.
- **`usersPasswordSchema`** (re-exported from `./schemas`) — field-level validation schema for password-related fields.

## Relationships

- **`src/modules/users/schemas.ts`** — Sole import target. Both exported symbols are defined here; this file merely re-exports them outward.

## Notes

- The module's only public surface is these two exports. The store (if one exists in this module) is intentionally *not* exposed through the barrel.
- The dependency edge to `account` is classified as **`published-language`** (shared vocabulary), distinct from the backend's **`shared-kernel`** relationship where both domains write the same record. Do not add store or mutation exports here without re-evaluating that classification.
