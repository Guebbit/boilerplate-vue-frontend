---
source: src/modules/returns/module.ts
sha256: bc812c1e60d68c7d60c369960e45f604a556fbbcfe5d82b343709003c69df92a
generated_at: 2026-10-17T01:37:29.203279+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/module.ts

## Purpose

Module manifest for the **returns** feature. It registers the returns routes, navigation entry, response schemas, and locale loaders into the app's module registry so the framework can mount the feature. It is a pure wiring file — no business logic lives here.

## Key elements

- **`default` export (`AppModule`)** – The single manifest object. Declares `name: 'returns'`, `loadingKeys: ['returns']`, and satisfies the `AppModule` type from `@/kernel/registry`.
- **`routes`** – Imported from `./routes` and passed through to the manifest as-is.
- **`navigation[0]`** – Registers the `ReturnsList` route in the **account** section (order 92, `Undo2` icon, label key `navigation.label-returns`).
- **`responseSchemas`** – Lazy import factory for `returnsResponseSchemas` from `./response-schemas`.
- **`locales.en` / `locales.it`** – Lazy import factories that load `./locales/en.json` and `./locales/it.json` respectively, both piped through the `dictionary` helper from the kernel registry.

## Relationships

- **`src/modules/returns/routes.ts`** — Imported at module level and assigned directly to the manifest's `routes` field. This is the only local import; all other assets (schemas, locales) are lazy-imported at call time.

## Notes

- The doc comment makes an explicit directional rule: the **orders** module may reach into returns (mounting `WithdrawalPanel`), but returns never reaches back into orders. A return references its order only by route name; order data comes from API responses, not from another store.
- The withdrawal (EU 14-day) button is modelled as the *create call* for a return object, not a separate endpoint — important if you're searching for a "cancel order" route and can't find one.
- `plural: 1` on the navigation entry is a Vue I18n pluralisation hint, not a count.
