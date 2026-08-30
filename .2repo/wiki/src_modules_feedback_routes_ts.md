# src/modules/feedback/routes.ts

## Purpose

Defines the two route records (public contact form and admin-only feedback inbox) for the feedback module. It is consumed by the module registry to mount these paths into the app's router.

## Key elements

- **default export** — An array typed as `RouteRecordRaw[]` containing exactly two route records:
  - **`contact`** — Public route (`/contact`), no access restriction. Lazy-loads `Contact.vue`. Title key: `contact-page.page-title`.
  - **`feedback`** — Admin-only route (`/feedback`), guarded by `meta.access: 'admin'`. Lazy-loads `FeedbackInbox.vue`. Title key: `feedback-inbox-page.page-title`.

## Relationships

- **`src/modules/feedback/module.ts`** — Imports this default array and registers it in the app's module/route registry, making the two paths available to the router.
- **`src/modules/feedback/tests/routes.spec.ts`** — Imports the route records to assert their paths, names, meta flags (especially the `access: 'admin'` guard), and lazy-component targets.

## Notes

- Both components are lazy-loaded via dynamic `import()` for code-splitting; the route records carry no pre-resolved component reference.
- The `contact` route is intentionally public (no `access` meta). The `feedback` route is the only one gated, and the gate is declared purely as a `meta.access` string—actual enforcement lives in the router guard layer, not here.
- Route names (`Contact`, `FeedbackInbox`) are the stable identifiers for programmatic navigation; they are not derived from the path.
