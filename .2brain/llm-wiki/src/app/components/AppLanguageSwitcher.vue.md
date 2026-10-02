---
source: src/app/components/AppLanguageSwitcher.vue
sha256: 4d621e682e6665f8b3a36923ebdd5edeac4a6122c42d5a1657904c693fa64a6c
generated_at: 2026-10-02T11:43:07.086664+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppLanguageSwitcher.vue

## Purpose

A language-switcher dropdown menu. It renders the list of supported locales, lets the user pick one, and then re-navigates the current route under the new `:locale` param. It deliberately does **not** load dictionaries or activate the locale itself—that work is delegated to the i18n runtime via the route param. This file owns only the routing side of the switch and the fire-and-forget persistence of the user's preference.

## Key elements

- **`switchLanguage(newLocale)`** – Fires `useSessionStore().persistLocalePreference(newLocale)` without awaiting it, then `router.replace`s to the same route with the new `:locale` param (preserving existing params and query). On navigation failure it falls back to `router.push('/')`.
- **`focusFirstItemOnOpen()`** – WAI-ARIA APG menu-button fallback: after the `v-menu` finishes opening (`@after-enter`), moves focus to the first `[role="menuitem"]` in the list if focus is still inside the activator.
- **`menuOpen` (ref)** – Tracks the `v-menu` open state; gates the focus-move logic.
- **`listElement` (ref)** – Template ref to the rendered `v-list`; used to scope the `querySelector` for the first menu item.
- **`i18n` / `t` / `locale`** – Obtained from `useI18n()`. Note that `t` and `locale` are destructured but `te` is **not**—it is always called as `i18n.te(key)` to keep it bound to the instance.
- **Template** – A Vuetify `v-menu` with a `v-btn` activator (shows the current locale code, e.g. "EN") and a `v-list` of `v-list-item` entries (one per `supportedLanguages` entry), each calling `switchLanguage`.

## Relationships

No graph neighbors are recorded for this file. It imports `supportedLanguages` from `@/i18n`, `languageLabel` from `@/i18n/language-label.ts`, and `useSessionStore` from `@/infrastructure/session.ts`, but none of those files list this component as a dependent in the tracked graph.

## Notes

- **Ordering is critical.** This component must *not* call `localeChoice` (or any dictionary-loading / locale-activating function) before the `router.replace`. The i18n runtime's route guard detects a language switch by comparing the incoming `:locale` param against the currently active locale. If the locale is activated first, the guard sees "no change" and skips cache invalidation—product pages would keep serving titles in the old language.
- **`persistLocalePreference` is intentionally not awaited.** The page must render in the new language before the account endpoint resolves; a failed write must not roll back the switch. The session store handles the "is anyone signed in?" question internally.
- **`te` binding gotcha.** `i18n.te` must be called as a property access (`i18n.te(key)`), never destructured. Destructuring produces an unbound method reference that throws at runtime.
- **Duplicated a11y logic.** The `focusFirstItemOnOpen` guard is a copy of the one in `AppNavMenu.vue`; the two menus intentionally share no extracted composable.
- **Accessibility specifics.** The activator's `aria-label` includes the visible locale code (WCAG 2.5.3 – Label in Name). List items use `role="menuitem"` + `aria-current` rather than a listbox/select pattern because picking an item is a one-shot action, not a selection.
