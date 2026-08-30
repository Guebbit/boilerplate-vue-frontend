# docs/theory/glossary.md

## Purpose

A per-module glossary that pins down what each domain term means *within that module's bounded context*. It exists to prevent cross-module ambiguity (e.g. "Cart" here is a read-only view, not an owned entity) and to explicitly mark the ownership boundary: most definitions state what the client does **not** own.

## Key elements

- **Per-module term tables** — one section per module (`account`, `admin`, `cart`, `delivery`, `demo`, `feedback`, `inventory`, `locales`, `orders`, `payments`, `products`, `realtime`, `users`, `wishlist`), each listing 1–5 terms with a one-sentence definition scoped to that module.
- **Ownership annotations** — definitions frequently read as negative statements ("never computed here", "this client renders and owns none of it"), making the client/server split explicit.
- **Cross-module references** — e.g. `users` → "Field rules" notes that `account` depends on it; `orders` → "Reorder" notes it writes into `cart` state; `cart` → "Badge" explains why siblings refresh the store.

## Relationships

- **`docs/modules/users.md`** — The `users` section here defines *User*, *Admin*, and *Field rules*; the module doc describes the implementation. The glossary's note that `account` depends on the user module's Zod schemas is the link.
- **`docs/modules/wishlist.md`** — The `wishlist` section defines *Wishlist* and *Move to cart*; "Move to cart" is the only write this module makes into `cart` state, tying the two module docs together.
- **`docs/theory/domain-layer.md`** — Explicitly linked from the glossary preamble as the place that explains *why* the ownership boundaries exist; the glossary supplies the vocabulary that the domain-layer doc formalizes.
- **`docs/theory/layers.md`** — Provides the infrastructure/domain separation that the glossary's "owned by `infrastructure/…`" annotations (e.g. Session, Stream transport) refer to.

## Notes

- Deliberately **not** a flat dictionary. The same word in two modules is two different concepts; merging them would defeat the bounded-context purpose.
- The file links to `./strategic-ddd.md`, which is **not** in the current neighbor set — if that file is absent, the link is a dangling reference.
- The glossary covers a frontend/client codebase. When a definition says "the server does X," it is documenting a boundary, not describing code in this repo.
- `locales` terms use a two-scope key model (`app` vs `api`) with separate keyspaces; the same dotted key in both scopes is unrelated.
