---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/users/
files: 15
updated: 2026-08-30T17:11:52.198826+00:00
---

# src/modules/users/

## Purpose

The `users` module implements the full admin-side user-management screen: a paginated list, a read-only detail page, and create/edit forms. It also owns the shared Zod validation schemas for the user form and the response-schema contracts that enforce runtime API validation on every users endpoint. All wiring is registered through the app's module system so the kernel can mount routes, navigation, and locale loaders in one pass.

## Key parts

- **Public surface & manifest** — `index.ts` exposes exactly two schema objects (the only import other modules may use); `module.ts` is the manifest that registers routes, a nav entry, response schemas, and locale loaders with `AppModule`.
- **Schemas** — `schemas.ts` holds the Zod form-validation rules with i18n-resolved error messages; `response-schemas.ts` maps each users API endpoint (method + path-regex) to a Zod envelope for contract validation.
- **Routing** — `routes.ts` declares the four `admin`-guarded route records (`RouteRecordRaw[]`) that Vue Router consumes.
- **Store** — `store.ts` is a Pinia store providing CRUD, paginated search, and avatar upload. Most logic delegates to `useStructureCrudApi`; hand-written code covers the multipart avatar branch and `hardDeleteUser`.
- **Views** — Four Vue SFCs in `views/`: `UsersList.vue` (filterable table with per-row actions), `User.vue` (read-only detail), `UserCreate.vue`, and `UserEdit.vue` (forms that compose `useAppForm` and call into the store).
- **Tests** — Unit specs (`routes.spec.ts`, `schemas-i18n.spec.ts`, `store.spec.ts`) and e2e sweep registrations (`a11y.cy.ts`, `users.visual.cy.ts`) co-located under `tests/` so they are deleted with the module.

## How it connects

- **`src/infrastructure/`** — The module leans on shared infrastructure for nearly every non-domain concern: `AppModule` (registration in `module.ts`), `useStructureCrudApi` (CRUD plumbing in `store.ts`), `response-schema-map` (consumes `response-schemas.ts` at runtime), `useAppForm` (form state/validation in the three form views), and `orvalMutator` (the HTTP transport the store calls and tests mock).
- **`tests/support/`** — The two e2e sweep files register their routes with the shared `sweepA11y` and `sweepVisual` helpers defined in the support layer, keeping the per-module file to a declarative list of URLs.

## Where to start

Read **`module.ts`** first — it is a compact, single-file tour of everything the module registers (routes, nav, schemas, locales) and immediately shows how it plugs into the app shell. Then open **`index.ts`** to see the deliberately narrow public API the rest of the codebase is allowed to consume; its comments explain *why* the store is excluded, which clarifies the module's boundary in one paragraph.

## Connected modules
```mermaid
flowchart LR
    m_src_modules_users["src/modules/users/"]
    m_src_infrastructure["src/infrastructure/<br/>27 files"]
    m_tests_support["tests/support/<br/>13 files"]
    m_src_modules_users --- m_src_infrastructure
    m_src_modules_users --- m_tests_support
    style m_src_modules_users stroke-width:3px
```

[[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]] · [[boilerplate-vue-frontend_tests_support|tests/support/]]

## Files
- `src/modules/users/index.ts` — Barrel re-export that defines the **only** public import surface for the `users` module. It exposes exactly two schema objects so sibling modules (specifically `account`) can validate forms against shared field rules without re-typing them. It deliberately omits the store, because the client-side sharing here is vocabulary (validation rules), not a shared record.
- `src/modules/users/module.ts` — Module manifest for the **users** admin screens (list, detail, create, edit). It registers routes, a navigation entry, response schemas, and locale loaders with the app's `AppModule` registry so the kernel can mount everything in one place.
- `src/modules/users/response-schemas.ts` — Declares the complete set of Zod response-schema contracts for the users domain's outbound API calls. Each row pairs an HTTP method and a path-regex pattern with the schema that validates the response envelope. The list is consumed by the `response-schema-map` infrastructure to perform runtime contract validation on every users endpoint response.
- `src/modules/users/routes.ts` — Declares the four route records for the users module (list, create, detail, edit). Each record pairs a URL path with a lazy-loaded Vue component and an `admin`-only `meta.access` guard, and the array is typed as `RouteRecordRaw[]` for registration into the app's Vue Router.
- `src/modules/users/schemas.ts` — Zod validation schemas for the user form (signup/profile). Each error message is an i18n thunk — a `() => translate(…)` call resolved at **parse time** rather than at schema-definition time, so the active locale is always honoured regardless of when the module was first loaded.
- `src/modules/users/store.ts` — Pinia store providing CRUD, paginated search, and avatar-upload support for users. It delegates nearly all wiring to the shared `useStructureCrudApi` primitive so that the only hand-written logic is the multipart branching for avatar uploads and the irreversible `hardDeleteUser` action.
- `src/modules/users/tests/e2e/a11y.cy.ts` — Co-located a11y route list for the **users** module. It registers four user-facing routes with the shared `sweepA11y` helper so that accessibility audits run against the admin view of each page. Placing the list inside the module (rather than in a central file) guarantees the routes vanish if the module is deleted, and a cross-cutting spec enforces that every routed module ships one of these files.
- `src/modules/users/tests/e2e/users.visual.cy.ts` — Declarative screen list for visual-regression testing of the users module. It feeds a single route entry (`users-list` → `/en/users`) into the shared `sweepVisual` helper so that a baseline screenshot is captured and compared on every visual run. The file exists per-module so that baselines (in a co-located `__snapshots__/` folder) are deleted together with the module, avoiding orphaned PNGs.
- `src/modules/users/tests/routes.spec.ts` — Vitest spec that asserts every users route record declares the expected `meta.access` value and that no route exists without an explicit access decision. It guards against a route silently losing its access restriction, which would otherwise be indistinguishable from a public route in all other tests.
- `src/modules/users/tests/schemas-i18n.spec.ts` — Vitest spec that verifies the users module's Zod schemas resolve validation error messages through the real vue-i18n instance into both English and Italian. It asserts a domain-specific invariant: every i18n key the schemas reference exists in both locale dictionaries, and the Italian strings are genuinely different from the English ones.
- `src/modules/users/tests/store.spec.ts` — Unit tests for the `useUsersStore` Pinia store. It mocks the HTTP transport (`orvalMutator`) at the boundary and asserts on the raw request objects (URL, method, body shape) that the store's actions produce. This mirrors the products store spec in structure and rationale.
- `src/modules/users/views/User.vue` — Read-only user detail page (registered as `UserTargetPage`). Receives a user `id` via props, triggers a fetch through the users store, and renders the user's fields (username, email, role, status, timestamps) in a structured detail layout with hero, stats cards, and action links.
- `src/modules/users/views/UserCreate.vue` — Vue 3 SFC (named `UserCreatePage`) that renders a user-creation form. It composes `useAppForm` for state/validation, delegates the actual create call to the users store (which branches between multipart and JSON based on whether an avatar is attached), and navigates to the new user's detail page on success.
- `src/modules/users/views/UserEdit.vue` — Vue 3 single-file component (named `UserEditPage`) that renders a single-user edit form. It loads a user by the `id` route prop, lets the user change email, password, and avatar, then persists the changes via the users store. An empty password or avatar field signals "leave unchanged."
- `src/modules/users/views/UsersList.vue` — Paginated user-list view that wires the Pinia `useUsersStore` search/filter state to a filter form, a `DataTable` with per-row actions (view, edit, soft-delete, hard-delete), and a pagination control. It is the main list page for the users module.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
