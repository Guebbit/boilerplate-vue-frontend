# docs/theory/layers.md

## Purpose

Defines the two orthogonal axes that govern where code lives: **tiers** (what a file is permitted to know) and **layers** (what a file does within a domain). It is the authoritative folder map for resolving "which directory does this go in?" without opening source files.

## Key elements

- **Tiers table** — six tiers (App, Registry, Modules, Kernel, UI, Infrastructure) with folder, knowledge boundary, and contents. Dependencies flow one way: `infrastructure → ui → kernel → modules → app`, enforced by per-tier `no-restricted-imports` blocks in `eslint.config.ts`.
- **Module dependency DAG** — 14 modules (account, admin, cart, delivery, demo, feedback, inventory, locales, orders, payments, products, realtime, users, wishlist); six declare edges, eight are leaves. Cycles throw at router-assembly time via `dependsOn` validation.
- **Layer stack diagram** — vertical ordering within a domain: Views → Composables/helpers → Stores → Generated client → HTTP layer → Backend.
- **Quick map table** — maps each layer (Views, Composables, Stores, Generated client, HTTP, Design system, Shared components, Layouts, App shell, Router, Locales, Styles) to its folder(s) and main responsibility.
- **Adding / removing a domain** — one folder + one registry line; `index.ts` (public barrel) only exists when another module actually imports from it.

## Relationships

- **`docs/theory/modules.md`** — covers the *content* of individual modules; this page covers *where* modules sit in the tier hierarchy and how they connect to each other.
- **`docs/theory/request-flow.md`** — the layer stack here (Views → Stores → HTTP → Backend) is the vertical axis that request-flow traces horizontally across modules.
- **`docs/theory/domain-layer.md`** — clarifies the distinction: "layers" in this file are intra-domain roles (route, view, store, schema); the domain-layer doc describes the domain boundary itself.
- **`docs/theory/glossary.md`** — source of definitions for terms used here (tier, barrel, DAG, `dependsOn`).
- **`src/app/guards/authentications.ts`** — lives in the App tier (`src/app/guards/`), listed in the Router row of the quick map as part of the navigation/guard concern.
- **`docs/modules/users.md`**, **`docs/modules/wishlist.md`** — concrete module instances that appear in the dependency DAG (`account → users`, `products → wishlist`, `wishlist → cart`).
- **`docs/theory/index.md`** — entry point that routes readers to this page for "where does code go" questions.

## Notes

- The module list in this file is a **snapshot** of `src/modules.ts`; if they disagree, the code is authoritative. Unit tests cover registry validation, not this prose.
- `demo` is a module (not app shell) *specifically* so it is deletable with one `rm -rf` + one registry line.
- A module may import another module's **public barrel** (`@/modules/<name>`) but never its internals; the lint rule is generated per-module so adding a domain requires no lint-config edit.
- Two modules that need each other are not a valid dependency pair — they are either one module or a misplaced state concern.
- `src/app/router/index.ts` names no individual domain; it walks the registry at runtime.
