# src/modules/realtime/module.ts

## Purpose

Module manifest for the **realtime** domain. Declares the module's routes, a single navigation entry, and lazy-loaded locale dictionaries, conforming to the `AppModule` shape consumed by the kernel registry. The module itself contains no domain logic — it is a thin screen for an observability-metrics SSE playground.

## Key elements

- **`default` export (satisfies `AppModule`)** — the module descriptor read by the kernel registry.
  - `name: 'realtime'` — unique module identifier.
  - `routes` — re-exported from `./routes`; the registered route table.
  - `navigation` — one entry: `RealtimePlayground`, placed in the `admin` section (order 30), labelled via the i18n key `navigation.label-realtime`, with the `Radio` icon from `lucide-vue-next`.
  - `locales` — lazy `en` and `it` dictionaries loaded dynamically from `./locales/{en,it}.json`.

## Relationships

- **`src/modules/realtime/routes.ts`** — imported as the `routes` field; provides the route definitions this module registers.

## Notes

- The SSE transport (`createSseClient`, a typed wrapper over `EventSource`) deliberately lives in `infrastructure`, **not** here. This module is only the screen, its store, and the feed component.
- The module is self-described as a "playground" with no domain model — treat it as a demo surface rather than a production feature.
- Locale loaders use `.then(({ default }) => …)` to unwrap JSON module defaults; keep that pattern if adding locales.
