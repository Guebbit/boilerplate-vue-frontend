---
source: src/app/components/AppLanguageSwitcher.vue
sha256: ea5a2f09e762f81c891b17230467840c88b1b21666dafa21f7ecb8a5df4405f2
generated_at: 2026-10-17T00:04:36.882006+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppLanguageSwitcher.vue

## Purpose

Language-switcher menu in the app header. It renders a dropdown of supported locales and, on selection, re-enters the current route under the new `:locale` param. It deliberately owns only the routing side of a switch; dictionary loading and locale persistence are delegated to the i18n runtime and the session store respectively.

## Key elements

- **`switchLanguage(newLocale: string)`** – Fire-and-forgets `useSessionStore().persistLocalePreference(newLocale)`, then `router.replace`-es to the same route with `params.locale` set to the new code (preserving existing params and query). Falls back to `router.push('/')` if the replace fails.
- **`focusFirstItemOnOpen()`** – WAI-ARIA APG menu-button guard: after the `v-menu` finishes its enter transition, moves focus to the first `[role="menuitem"]` inside the list if focus is not already within it.
- **`menuOpen` / `listElement`** – Reactive refs backing the `v-menu` open state and the `v-list` instance, used by the focus helper.
- **Template** – A `v-menu` whose activator is a text button showing the current locale code (e.g. "EN") with a `Languages` icon; the list body iterates `supportedLanguages` as `role="menuitem"` rows, highlighting the active one with a `Check` icon.

## Relationships

The dependency graph records no neighbors for this file, but it imports:

- `@/i18n` → `supportedLanguages` (the locale list to render)
- `@/i18n/language-label.ts` → `languageLabel` (human-readable name per locale)
- `@/infrastructure/session.ts` → `useSessionStore().persistLocalePreference` (remembering the choice for signed-in users)

Comments reference `AppNavMenu.vue` as the source of the same focus-first-item pattern; the two components share no extracted helper.

## Notes

- **Do not call `i18n`'s locale setter before navigating.** The route guard detects a switch by comparing the incoming `:locale` param against the already-active locale. If this component activated the language first, the guard would see "no change" and skip re-fetching locale-sensitive data (e.g. a product page title).
- **`persistLocalePreference` is intentionally not awaited** so the UI is already in the new language before the account API resolves; a failed write must not revert the switch.
- **`te` is accessed as `i18n.te(key)`, not destructured**, to keep it bound to the i18n instance.
- The focus-first-item logic is duplicated from `AppNavMenu.vue` by design — no shared menu-a11y component exists yet.
- The activator's `aria-label` includes the visible locale code (WCAG 2.5.3: label-in-name) so voice-control users can say what they see.
