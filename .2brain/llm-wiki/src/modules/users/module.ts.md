---
source: src/modules/users/module.ts
sha256: 01e03879b85b50fa509d6657749cbbebc2cce643baec1206e2ee28b837f99d71
signature: 01e03879b85b50fa509d6657749cbbebc2cce643baec1206e2ee28b837f99d71
generated_at: 2026-11-10T06:04:30.542353+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/module.ts

## Purpose

Module manifest that registers the **users** admin screens (list, detail, create, edit) into the app's module registry. It wires together the module's routes, a navigation entry (with a live review badge), response schemas, and locale loaders so the kernel can discover and mount the module.

## Key elements

- **`export default { … } satisfies AppModule`** — the sole export; a plain object conforming to the `AppModule` contract from `@/kernel/registry`.
- **`routes`** — imported from `./routes` and passed straight through to the registry.
- **`navigation`** — a single entry for the *UsersList* view (admin section, order 50, `Users` lucide icon). The `badge` property calls `useReviewBadge()` to display a live count of accounts flagged for review.
- **`responseSchemas`** — lazy-imports `./response-schemas` and re-exports `usersResponseSchemas`.
- **`locales`** — lazy-imports `en.json` and `it.json`, each run through the shared `dictionary` helper from the registry.
- **`loadingKeys: ['users']`** — key used by the kernel's loading/i18n system for this module.

## Relationships

- **`src/modules/users/routes.ts`** — imported and assigned to the manifest's `routes` field; defines the actual path definitions for the admin CRUD screens.
- **`src/modules/users/composables/use-review-badge.ts`** — imported and invoked inside the navigation `badge` callback to compute the live review count shown on the nav item.
- **`@/kernel/registry`** (not a listed neighbor) — provides the `AppModule` type and the `dictionary` helper used for locale loading.

No visible interaction with `src/modules/tasks/module.ts`, `src/modules/webhooks/module.ts`, or the test file.

## Notes

- The module is **dependency-free** by design: the *account* module reads shared field rules from here, not the other way around. A user record is independent of any session.
- The review-badge is **live** (recomputed via the composable on every nav render), not a static count.
- Locale loading is intentionally limited to `en` and `it`; adding a language means adding a new key to the `locales` object.
