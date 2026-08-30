# src/modules/users/index.ts

## Purpose

Barrel re-export that defines the **only** public import surface for the `users` module. It exposes exactly two schema objects so sibling modules (specifically `account`) can validate forms against shared field rules without re-typing them. It deliberately omits the store, because the client-side sharing here is vocabulary (validation rules), not a shared record.

## Key elements

- **`usersSchema`** — re-exported from `./schemas`; the primary validation schema for user form fields.
- **`usersPasswordSchema`** — re-exported from `./schemas`; validation rules specific to the password field, consumed by account's login / signup / password-reset forms.

## Relationships

- **`src/modules/users/schemas.ts`** — sole import source; this barrel re-exports its two named schema objects and nothing else.
- The `account` module (sibling, not in this file's dependency list) is the intended consumer: it imports these two schemas rather than duplicating field rules. The edge is classified as *published-language* (shared vocabulary), not *shared-kernel* (shared write target), because neither client module writes the record — the API does.

## Notes

- The store is **intentionally absent** from this barrel. Importing it from outside would collapse the "vocabulary-sharing" boundary into a "shared-state" one, which is the distinction the docblock calls out between client and server architectures.
- If you need to add a new export visible to siblings, it must go through this file — sibling modules are expected to import the barrel, not reach into `./schemas` directly.
- The `@module` tag at the top marks this as a side-effect-free, re-export-only file (no runtime logic of its own).
