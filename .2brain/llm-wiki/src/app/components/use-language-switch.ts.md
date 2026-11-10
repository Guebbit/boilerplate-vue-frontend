---
source: src/app/components/use-language-switch.ts
sha256: 63b3c2cb6442ec4064697663ce13c4944f92875c381610b5a6d782d892d6cec0
signature: ba359fb9b88c7e502d0fff74c4ae872f1fce910c3a35fdf33e552c4e5a5ebf14
generated_at: 2026-11-10T02:54:14.586088+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/use-language-switch.ts

## Purpose

A single composable that bundles everything a UI surface needs to let a visitor change the app language: the list of choices, the active locale, a localised label helper, draft detection, and the navigation action. Both the top-bar language menu and the phone-drawer language entries call this one function so the switching logic stays in one place.

## Key elements

- **`useLanguageSwitch()`** — the sole export. Returns `{ languages, locale, choiceLabel, isDraft, switchLanguage }`.
- **`switchLanguage(newLocale)`** — re-enters the *current* route with the `:locale` param replaced. Does **not** set `i18n.locale` directly; activation is delegated to the route guard via the param change. Falls back to `router.push('/')` if the replace fails.
- **`choiceLabel(choice)`** — resolves a human-readable label for a locale code in the *currently active* language via `languageLabel`.
- **`isDraft`** — the `isDraftLanguage` predicate, exposed so callers can badge draft/preview languages.
- **`languages`** — the `supportedLanguages` array, the static list of available locale codes.

## Relationships

- **`src/infrastructure/locale-overrides.ts`** — provides `isDraftLanguage`. `switchLanguage` checks it before deciding whether to fire `persistLocalePreference`; draft locales are previewed for the session only and never written to the account.
- **`tests/cross-cutting/module-map.spec.ts`** — asserts that this module's import surface appears in the project's expected dependency map, keeping the set of exported symbols stable.

## Notes

- **Routing-only by design.** The composable intentionally does *not* set `i18n.locale` before navigating. The route guard detects a language switch by comparing the incoming `:locale` param against the currently active locale; if a caller pre-set the locale, every switch would look like "no switch" and locale-sensitive caches (e.g. a product title) would not be invalidated.
- **`persistLocalePreference` is fire-and-forget.** It is invoked with `void` and never awaited so that a slow or failing account write cannot block the page render or roll back the visual switch.
- **`i18n.te` is read off the instance** (`i18n.te(key)`) rather than destructured, to keep the method bound to the correct instance.
- Draft languages skip persistence entirely; they are a session-only preview.
