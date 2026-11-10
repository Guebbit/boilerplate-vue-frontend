---
source: src/modules/tasks/module.ts
sha256: 55861a3c49df5c7da2bde6c1e59f58043baef0bde8d62146395ae6ff905c3e38
signature: 55861a3c49df5c7da2bde6c1e59f58043baef0bde8d62146395ae6ff905c3e38
generated_at: 2026-11-10T05:56:39.240122+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/module.ts

## Purpose

Module manifest that registers the **tasks** domain into the application's module registry. It wires together the module's routes, navigation entries, response schemas, and locale loaders so the kernel can mount the Contact form (public) and the TaskInbox admin page. The module is intentionally self-contained: it references no other domain's records.

## Key elements

- **`default export`** — An object satisfying the `AppModule` interface with:
  - `name: 'tasks'` — registry key.
  - `loadingKeys: ['tasks']` — i18n keys loaded before the module activates.
  - `routes` — imported from `./routes`; the page definitions for the module.
  - `navigation` — two entries:
    - **Contact** (`section: 'main'`, icon `Mail`) — the public contact-form nav item.
    - **TaskInbox** (`section: 'admin'`, icon `Inbox`) — the admin inbox; its `badge` callback delegates to `useTaskBadge()` to show a pending/assigned task count.
  - `responseSchemas` — lazily imports `./response-schemas` and returns `tasksResponseSchemas`.
  - `locales` — lazily imports `en.json` / `it.json` and pipes them through the kernel `dictionary` helper.

## Relationships

- **`src/modules/tasks/routes.ts`** — imported directly; provides the `routes` array consumed by the registry.
- **`src/modules/tasks/composables/use-task-badge.ts`** — imported directly; its `useTaskBadge()` function is called inside the TaskInbox navigation `badge` thunk to compute the badge value.
- **`src/modules/tasks/tests/task-badge.spec.ts`** — unit-tests the `useTaskBadge` composable that this manifest references; does not exercise this manifest file directly.

## Notes

- The `badge` property on the TaskInbox nav entry is a **function**, not a static number. The kernel invokes it at render time; it returns whatever `useTaskBadge()` produces (tasks awaiting a responder + tasks assigned to the viewer).
- `responseSchemas` and `locales` are **lazy thunks** (`() => import(...)`), so their modules are code-split and only fetched when needed.
- The file is type-checked against `AppModule` via `satisfies`, not `as` — it still retains its concrete literal types for downstream tooling.
- The doc comment references `docs/modules/tasks.md` § "The map" for broader context; the subdomain is classified as `generic`.
