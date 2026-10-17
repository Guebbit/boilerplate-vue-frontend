---
source: src/modules/feedback/module.ts
sha256: ca7bd8241b5cd49d2a4cafe149f8aba3dc34b5cc4f310f2557eb4837b89a06ef
generated_at: 2026-10-17T00:55:29.976672+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/module.ts

## Purpose

Module manifest for the **feedback** domain. It wires the contact form and admin inbox routes, navigation entries, response schemas, and locale loaders into the app's module registry (`AppModule`). It is the single registration point the kernel reads to boot this feature.

## Key elements

- **`export default { … } satisfies AppModule`** — the sole export. Registers the module under the name `'feedback'` and supplies every field the kernel expects (routes, navigation, schemas, locales).
- **`routes`** — re-exported from `./routes`; the page paths for the contact form and the inbox.
- **`navigation`** — two nav entries:
  - *Contact* (`order 95`, section `main`, icon `Mail`) — the public-facing contact form link.
  - *FeedbackInbox* (`order 45`, section `admin`, icon `Inbox`) — the admin inbox link.
- **`responseSchemas`** — lazy-loads `./response-schemas` and exposes `feedbackResponseSchemas` for runtime response validation.
- **`locales`** — lazy-loads `en.json` and `it.json` through the `dictionary` helper so translations are only fetched on demand.
- **`loadingKeys: ['feedback']`** — tells the registry which i18n key group to await before rendering.

## Relationships

- **`src/modules/feedback/routes.ts`** — imported and assigned directly to the `routes` field. This file does not transform the routes; it simply passes them through to the registry.

## Notes

- The module is intentionally self-contained: the doc comment states it references no other domain's records. Both views talk only to feedback's own endpoints.
- `responseSchemas` and each `locales` entry are **thunks** (return a Promise), not static values. The kernel invokes them lazily; code that destructures them expecting a plain object will get a function.
- Navigation `order` values are non-contiguous (95 / 45) — they slot between other modules' entries rather than being sequential within this file.
- Both nav items set `plural: 1`, meaning the label is shown as-is regardless of item count.
