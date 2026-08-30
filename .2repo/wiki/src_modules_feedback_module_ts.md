# src/modules/feedback/module.ts

## Purpose
Module manifest that registers the feedback feature (contact form + admin inbox) into the app's module registry. It wires together routes, navigation entries, response schemas, and locale loaders so the kernel can discover and mount the module without importing its internals directly.

## Key elements
- **Default export** (`satisfies AppModule`) — a single object conforming to the `@/kernel/registry` `AppModule` interface. Fields:
  - `name: 'feedback'` — registry key for this module.
  - `routes` — re-exported from `./routes`.
  - `navigation` — two entries: **Contact** (main section, `Mail` icon, order 95) and **FeedbackInbox** (admin section, `Inbox` icon, order 45).
  - `responseSchemas` — re-exported from `./response-schemas`.
  - `locales` — lazy-loaded dictionaries for `en` and `it` via dynamic `import()` of JSON files under `./locales/`.

## Relationships
- **`./routes`** (`src/modules/feedback/routes.ts`) — source of the `routes` array; this file re-exports it into the manifest.
- **`./response-schemas.ts`** (`src/modules/feedback/response-schemas.ts`) — source of `feedbackResponseSchemas`; re-exported here for the registry to consume.
- **`@/kernel/registry`** — provides the `AppModule` type that this object must satisfy.

## Notes
- The module is deliberately domain-agnostic: its tickets reference no other domain's records, and both views talk only to this module's own endpoints. The comment notes the backend endpoints pre-existed; this file is the frontend registering its half.
- Navigation ordering is inverted by section: admin items (order 45) sort before main items (order 95).
- `satisfies AppModule` enforces the interface shape at compile time without widening the inferred property types (e.g., icon components stay as their concrete Lucide types).
- Locales are loaded lazily (dynamic `import`), so the JSON is not bundled until a locale is actually requested.
