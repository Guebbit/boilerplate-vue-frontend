---
source: src/modules/locales/module.ts
sha256: 4feea411df77631d3924c91e0bec9cbb565e44a8c793f3781d6d97d4977db067
generated_at: 2026-10-17T01:04:02.438865+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/module.ts

## Purpose

Module manifest for the translation-admin domain. Declares the locales screens' routes, a single admin navigation entry, response-schema rows, and per-locale JSON loaders in the `AppModule` shape consumed by the kernel registry.

## Key elements

- **Default export** – an object satisfying `AppModule`; the single thing the registry reads for this domain.
- **`routes`** – re-exported from `./routes`; defines the URL surface under `/locales/*`.
- **`navigation`** – one entry (`LocalesList`, icon `Languages`, section `admin`, order 43). Intentionally singular: the dictionary board is a sub-view reached from the languages board, not a peer.
- **`responseSchemas`** – lazy `import('./response-schemas')` returning `localesResponseSchemas`.
- **`locales`** – lazy imports of `en.json` / `it.json`, each piped through the registry's `dictionary` helper.
- **`loadingKeys: ['locales']`** – key the kernel uses to gate loading.

## Relationships

- **`src/modules/locales/routes.ts`** – the sole file-level import besides the kernel and icon library; supplies the `routes` array that this manifest re-exposes.

## Notes

- This is the **author** side of the locales tier. The **consumer** side (per-visitor locale switching) lives in `infrastructure/locale-overrides.ts` and has no module manifest. Removing this folder deletes the admin screens but leaves all rendered translations intact, because the two shared infrastructure reads (`GET /locales`, `GET /locales/{tag}/messages`) are registered by the bottom tier independently.
- `satisfies AppModule` is a compile-time assertion only; it does not extend or narrow the object's shape at runtime.
