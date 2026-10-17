---
source: src/modules/webhooks/module.ts
sha256: 3cb80a432a46f245b4aae16596f81a6deebe154bc8b44419fc35d44a90bc17c0
generated_at: 2026-10-17T01:50:33.819479+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/module.ts

## Purpose

Module manifest that registers the webhooks feature into the app's module registry (`AppModule` from `@/kernel/registry`). It wires together the routes, two admin navigation entries, lazy-loaded response schemas, and locale dictionaries so the rest of the app can discover and render the webhook subscription and delivery-log pages.

## Key elements

- **`export default { … } satisfies AppModule`** — the single default export that the kernel registry consumes. Declares the module name (`'webhooks'`), its loading keys, routes, navigation entries, response-schemas loader, and per-locale dictionary loaders.
- **`navigation` array** — two entries:
  - `WebhooksList` (icon `Webhook`, order 48) — subscription management (create / rotate / remove).
  - `WebhookDeliveries` (icon `History`, order 49) — delivery log (read / replay).
  Both live under the `admin` section.
- **`responseSchemas`** — lazy `import('./response-schemas')` that resolves to `webhooksResponseSchemas`.
- **`locales`** — lazy `import()` for `./locales/en.json` and `./locales/it.json`, each piped through the shared `dictionary` helper.
- **`routes`** — re-exported from the sibling `./routes` module.

## Relationships

- **`src/modules/webhooks/routes.ts`** — imported at the top of the file and passed through as the `routes` field of the manifest. This is the only file this module directly imports (aside from the kernel registry type and lucide icons).

## Notes

- The module intentionally **does not** import anything from the orders or payments modules; webhook subscriptions and deliveries are produced by the backend's domain-event bus, keeping this UI module dependency-free at the import level.
- Two separate nav entries (list + deliveries) mirror the split the `feedback` module uses for its public form vs. admin inbox — they are treated as distinct operator tasks, not sub-pages.
- `loadingKeys: ['webhooks']` is what the shell checks before showing the module's nav items; any new i18n namespace must be added here or the entries stay hidden.
