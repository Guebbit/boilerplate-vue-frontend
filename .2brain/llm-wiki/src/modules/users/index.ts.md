---
source: src/modules/users/index.ts
sha256: 4f2385053a9cf68b606abaf3202c7464b92816b11ec918833117ad76299b0c32
generated_at: 2026-10-17T01:46:01.990394+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/index.ts

## Purpose
Barrel (public surface) for the `users` module. It exists so that sibling modules (specifically `account`) can import the shared validation schemas without reaching into internal files. By exporting the two schemas here, the field rules are written once and agreed upon across modules instead of being re-typed and allowed to diverge.

## Key elements
- **`export { usersSchema, usersPasswordSchema } from './schemas'`** — Re-exports the two validation schemas. This is the module's entire public API.

## Relationships
- **→ `src/modules/users/schemas.ts`** — The sole dependency; `usersSchema` and `usersPasswordSchema` are defined there and re-exported through this barrel.
- **← `account` module** (per doc-comment) — Imports these schemas so login, signup, and password-reset forms validate against the same field rules as users' own forms. The doc-comment classifies this edge as *published-language* (shared vocabulary, read-only) rather than a shared-kernel (shared mutable record).

## Notes
- This file is deliberately **not** the store. The comment makes the client/server distinction explicit: on the backend `account → users` would be a `shared-kernel` (both sides write the same record); here neither module writes anything—the API does—so what is shared is only the shape of the data (vocabulary).
- Convention noted in the header comment: a sibling's barrel is the **only** import surface for cross-module imports. Do not import from `./schemas` directly in another module; go through this index.
