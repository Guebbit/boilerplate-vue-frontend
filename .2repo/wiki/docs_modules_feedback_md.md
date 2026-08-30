# docs/modules/feedback.md

## Purpose

Frontend module for a public contact form and the admin inbox behind it. Two screens (`Contact`, `FeedbackInbox`), one Pinia store, and three API endpoints. It is a fully self-contained leaf: no dependencies in either direction, no barrel export, and a backend counterpart that already exists in `boilerplate-node-backend`.

## Key elements

- **`module.ts`** — the manifest; the only file the application loads directly. Declares name, routes, nav entries, response schemas, dependency edges, and locales.
- **`store.ts`** — Pinia store. State: `requests`. Getters: `loading`. Actions: `submitContact`, `fetchRequests`, `updateStatus`.
- **`views/Contact.vue`** — public-facing form; renders the store, no fetching logic of its own.
- **`views/FeedbackInbox.vue`** — admin inbox; same separation of concerns.
- **`routes.ts`** — route records spliced into the localised route tree; each carries its own `meta.access` (`public` / `admin`).
- **`response-schemas.ts`** — one Zod envelope per endpoint (`ListFeedbackRequestsResponse`, `UpdateFeedbackRequestStatusResponse`, `CreateFeedbackRequestResponse`).
- **`locales/en.json` / `locales/it.json`** — per-language translation chunks loaded independently.
- **`tests/`** — 2 Vitest suites (store, routes), 3 Cypress e2e suites, 1 visual-regression snapshot.

## Relationships

None. No module depends on `feedback` and it depends on none. Deleting the folder and its single line in `src/modules.ts` removes it cleanly with no ripple effect.

## Notes

- **No barrel export.** Because there is no `index.ts` re-exporting from this folder, no sibling module can import from it. This is intentional and enforced by the module-system rules.
- **Access is route-level, not menu-level.** The public/admin split lives in each route's `meta.access`. Navigation entries never restate a permission, which keeps the menu and router from disagreeing.
- **Subdomain is `generic`.** Treated as a solved problem; the wiki explicitly flags that modelling effort here would be wasted.
- **Reference module.** Together with `demo` and `realtime`, `feedback` is recommended reading for understanding the module system in its zero-coupling form.
- **Regenerate after backend changes.** If an endpoint this module calls changes shape, run `npm run regenerate` to refresh the client and re-validate the Zod envelopes.
