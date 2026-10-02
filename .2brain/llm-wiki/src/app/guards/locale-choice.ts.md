---
source: src/app/guards/locale-choice.ts
sha256: faee7b24b4b43e2906961db7b59f10fe2461d1adbe04f43129bd663ce3cb45f6
generated_at: 2026-10-02T11:47:11.351746+00:00
model: ollama:qwen3.8:27b
---

# src/app/guards/locale-choice.ts

## Purpose

Vue Router `beforeResolve` guard that keeps the active i18n locale in sync with the `:locale` route parameter. On first use of a locale it loads the bundled JSON dictionary plus any remote overrides, registers the messages, and activates the language. If the param is missing or unsupported it redirects to the same route with the default locale injected.

## Key elements

- **`fetchLanguageApi(locale)`** — Assembles a locale's full dictionary (bundled JSON + remote overrides) and always resolves (never rejects). An unsupported locale, failed import, or unreachable API each degrade to an empty dictionary so navigation is never stranded.
- **`localeChoice(to)`** — The exported guard. Reads `to.params.locale`, then either activates an already-loaded locale, fetches + activates a supported-but-unloaded one, or redirects to the default locale. Returns `true` or a `RouteLocationRaw` redirect.
- **`latestRequestedLocale`** (module-level `let`) — Tracks the most recently requested locale across concurrent guard invocations to resolve race conditions from rapid language switches.
- **`activateIfLatest(locale)`** (private) — Calls `changeLanguage` only if no newer navigation has superseded the current chain; otherwise resolves immediately.

## Relationships

No graph neighbors are registered in the wiki. The file imports from `@/i18n` (locale registry, `changeLanguage`, `updateLocale`, `loadedLanguages`, etc.) and `@/infrastructure/locale-overrides.ts` (`withLocaleOverrides`), and types from `vue-router`.

## Notes

- **Always-resolves contract:** `fetchLanguageApi` never rejects. Callers (`localeChoice`) have no `.catch`; a failed dictionary degrades to `{}` and i18n falls back per key.
- **Race-condition guard:** Two rapid navigations can settle in either order. `latestRequestedLocale` is stamped synchronously before any async work so a slower chain for an earlier locale simply no-ops.
- **Local vs. remote dictionaries:** The bundled `@/locales/{locale}.json` import is intentionally static (Vite bundles it at build time). Remote overrides are a network fetch merged per-key on top. A locale with no bundled file works entirely from overrides.
- **Stryker comment on `import(\`@/locales/${locale}.json\`)`:** Mutating the template literal to `""` produces `import("")`, which breaks Vite's transform for the entire module — hence the mutation-test disable.
- **Store coupling:** The server-text cache in the store is keyed on the active locale via `dependsOn`, so switching locales here requires no explicit cleanup.
