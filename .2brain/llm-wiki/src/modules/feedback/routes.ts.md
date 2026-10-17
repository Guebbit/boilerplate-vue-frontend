---
source: src/modules/feedback/routes.ts
sha256: 0990a12659ed93c2c073cdd1506186762830e18669fdfa7c9900826cd8b19b1e
generated_at: 2026-10-17T00:55:44.868248+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/routes.ts

## Purpose

Declares the route table for the feedback module. It maps two URL paths — a public contact form and an authenticated admin inbox — to their respective Vue components, and exports the array so the app's module registry can mount them.

## Key elements

- **Default export** — an array satisfying `RouteRecordRaw[]` with two entries:
  - `Contact` (`/contact`) — public route; no auth or permission meta. Lazy-loads `./views/Contact.vue`.
  - `FeedbackInbox` (`/feedback`) — requires `auth` access and the `read Feedback` permission. Lazy-loads `./views/FeedbackInbox.vue`.
- **`meta.title`** — each route carries an i18n key (e.g. `contact-page.page-title`) used by the layout to render the page heading.
- **`satisfies RouteRecordRaw[]`** — enforces the Vue Router type contract at compile time while preserving the literal type of the array (prevents widening to `Record<string, unknown>[]`).

## Relationships

- **`src/modules/feedback/module.ts`** — imports this default export and registers the routes with the app's module system.
- **`src/modules/feedback/tests/routes.spec.ts`** — unit-test suite that asserts the exported array's shape, paths, names, meta, and component references.

## Notes

- The `Contact` route is intentionally public (no `access` or `can` keys); this is the only feedback route reachable without authentication.
- Both components are loaded via dynamic `import()`, so they are split into separate chunks.
- Route `name` values (`Contact`, `FeedbackInbox`) are the stable identifiers for programmatic navigation — prefer them over path strings in link/router calls.
