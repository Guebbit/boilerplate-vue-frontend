---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/feedback/
files: 11
updated: 2026-09-03T10:58:37.860207+00:00
---

# src/modules/feedback/

## Purpose

The feedback module provides a two-surface contact/feedback feature: a public, no-auth form for visitors to submit a message, and an admin-only inbox where operators can review tickets, update their status, or delete them (GDPR erasure). It owns the routes, state management, validation schemas, and end-to-end test coverage for that loop, while registering itself with the application kernel through a module manifest.

## Key parts

- **Registration & contracts** — `module.ts` (manifest that wires routes, schemas, nav entries, and locale loaders into the registry), `routes.ts` (the two route records: public form + admin inbox), and `response-schemas.ts` (method/URL → validation-envelope mapping so the HTTP layer picks the right schema at runtime).
- **State** — `store.ts`: a Pinia setup-style store exposing `submit`, `list`, `updateStatus`, and `delete` actions built on the shared `useStructureRestApi` plumbing. It is the first frontend caller of the feedback endpoints.
- **Views** — `views/Contact.vue` (Zod-validated public form that delegates to the store) and `views/FeedbackInbox.vue` (ticket cards with status-change and delete actions, all strings via `vue-i18n`).
- **Tests** — Unit specs (`tests/routes.spec.ts` for the access contract, `tests/store.spec.ts` for store invariants) and co-located Cypress e2e specs (`tests/e2e/`) covering the full user loop, accessibility sweeps, and visual-regression targets.

## How it connects

- **`src/infrastructure/`** — The module manifest plugs into the application kernel's module registry. The store relies on the infrastructure's `useStructureRestApi` helper for shared loading-flag management and on the generated API client (`orvalMutator`) for actual HTTP calls. `response-schemas.ts` references envelope types exported from `@api/schemas`, an infrastructure concern.
- **`tests/support/`** — The e2e specs import shared helpers `sweepA11y` (accessibility) and `sweepVisual` (screenshot comparison) from this support package, so each module only declares *which* routes to sweep while the shared code handles orchestration.

## Where to start

Read `module.ts` first to see how the feature registers itself (routes, schemas, nav) and then jump to `store.ts` to understand the data flow: every user action in either view funnels through the store's actions into the generated API client. Together they reveal the boundary between this module's UI concerns and the shared infrastructure it depends on.

## Connected modules
```mermaid
flowchart LR
    m_src_modules_feedback["src/modules/feedback/"]
    m_src_infrastructure["src/infrastructure/<br/>21 files"]
    m_tests_support["tests/support/<br/>13 files"]
    m_src_modules_feedback --- m_src_infrastructure
    m_src_modules_feedback --- m_tests_support
    style m_src_modules_feedback stroke-width:3px
```

[[boilerplate-vue-frontend_src_infrastructure|src/infrastructure/]] · [[boilerplate-vue-frontend_tests_support|tests/support/]]

## Files
- `src/modules/feedback/module.ts` — Module manifest that registers the feedback feature (contact form + admin inbox) into the app's module registry. It wires together routes, navigation entries, response schemas, and locale loaders so the kernel can discover and mount the module without importing its internals directly.
- `src/modules/feedback/response-schemas.ts` — Declares the response-validation schema table for every feedback endpoint the module calls. Each row pairs an HTTP method and a URL regex with the `@api/schemas` envelope type that validates a successful response, so the HTTP layer can pick the correct schema at runtime.
- `src/modules/feedback/routes.ts` — Defines the two route records (public contact form and admin-only feedback inbox) for the feedback module. It is consumed by the module registry to mount these paths into the app's router.
- `src/modules/feedback/store.ts` — Pinia (setup-style) store for the feedback module. It exposes a public contact-form submit action and an admin inbox (list, status-update, delete) built on the toolkit's `useStructureRestApi` for shared loading-flag plumbing. It is the first frontend code to call the feedback endpoints, which predate this module.
- `src/modules/feedback/tests/e2e/a11y.cy.ts` — Cypress e2e test that runs the shared `sweepA11y` accessibility sweep against the feedback module's routes on both the public and admin surfaces. It is co-located with the module so that deleting the feedback module removes its a11y coverage automatically, rather than leaving dangling route entries in a central list.
- `src/modules/feedback/tests/e2e/feedback.cy.ts` — Cypress end-to-end spec that exercises the feedback module's full user loop: submitting the public contact form and verifying the resulting ticket in the admin inbox. It also covers spam/honeypot detection, ticket deletion (and cancellation), form validation, role-based access control, and the static-page cross-linking that anchors the contact page. The inbox is intentionally empty at test start — the form submission *is* the fixture.
- `src/modules/feedback/tests/e2e/feedback.visual.cy.ts` — Declares the list of routes (one entry) for the feedback module's visual-regression test run. It hands that list to the shared `sweepVisual` helper, which orchestrates the actual screenshot capture and comparison. This file exists so each module's visual targets live alongside that module rather than in a monolithic central file.
- `src/modules/feedback/tests/routes.spec.ts` — Guards the `meta.access` declaration of every feedback route so that a route cannot silently lose its access restriction (and become publicly reachable) without a deliberate test update. It encodes the module's access contract as a hard-coded table: the contact form is public, the inbox is admin-only.
- `src/modules/feedback/tests/store.spec.ts` — Vitest spec for the feedback Pinia store. It mocks the HTTP transport layer (`orvalMutator`) as a `METHOD /url` router so the store under test and the generated API client remain real. The tests pin two invariants: the inbox is always replaced wholesale by the API response (never a local guess), and status-update / delete operations trigger a follow-up `GET /feedback` reload.
- `src/modules/feedback/views/Contact.vue` — Public, no-auth-required contact form for visitors to submit feedback directly to the admin inbox. It validates user input against a Zod schema, delegates submission to the feedback store, and resets itself on success.
- `src/modules/feedback/views/FeedbackInbox.vue` — Admin inbox view for the public contact/feedback form. On mount it loads the full ticket list from the feedback store, then renders each ticket as a card where an operator can change the ticket's status or delete it (GDPR erasure path). All user-facing strings go through `vue-i18n`.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
