---
source: src/app/components/AppLanguageSwitcher.vue
sha256: 62570130306241e0af4622d7fd81fa66f3cccab0882e6d9cd9105a13b3819e0b
signature: e996e5fe92b865b5c58a2a32876332932ec94b8ea481a8070eeb629f929d8f9a
generated_at: 2026-11-10T02:49:30.596415+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppLanguageSwitcher.vue

## Purpose

Renders the language-switcher button and dropdown menu in the app bar. It delegates all language logic (available locales, active locale, label formatting, draft detection, and the switch action) to the shared `useLanguageSwitch` composable so that the phone drawer can present the same choices without duplicating state.

## Key elements

- **`focusFirstItemOnOpen()`** — WAI-ARIA APG menu-button fallback: after the menu finishes opening (`@after-enter`), moves keyboard focus to the first `[role="menuitem"]` inside the rendered `v-list`. Guards against the case where focus is already inside the list (e.g. arrow-key open).
- **`menuOpen` (ref)** — Vuetify `v-menu` open/close state; also the gate for `focusFirstItemOnOpen`.
- **`listElement` (ref)** — Component-instance ref pointing at the `v-list`; used to query its `$el` for the first menu item.
- **Template** — A `v-btn` activator (hidden below `sm:` breakpoint) showing the current locale code, a draft-language cue, and an `aria-label` that includes both the visible text and the "Language" group label (WCAG 2.5.3). The dropdown is a `v-list` with `role="menu"`; each `v-list-item` carries `role="menuitem"`, its own `lang` attribute, `aria-current`, a check icon for the active locale, and an optional draft marker rendered in the *viewer's* locale (WCAG 3.1.2).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The focus-management fallback is intentionally **not** shared with `AppNavMenu.vue`; the two menus are siblings with no common parent component, so each carries its own copy. The in-code comment cross-references the other for full reasoning.
- The `aria-label` on the activator button is built as `"<Language label>: <CODE>"` so a voice-control user saying what they see ("EN") still matches the accessible name.
- Draft-language markers appear in two places (button and list item) and always render in the *viewer's* current locale, while the surrounding list-item text renders in the *item's* locale (`:lang="sLocale"`).
- The button is `hidden px-2 sm:inline-flex` — it is entirely absent on mobile where the phone drawer handles language switching.
