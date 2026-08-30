# src/app/components/AppLanguageSwitcher.vue

## Purpose

Renders a dropdown menu for switching the app's display language. The component owns only the **routing** half of a language switch (re-navigating the current route under the new locale prefix); dictionary loading and locale persistence are delegated to other modules.

## Key elements

- **`switchLanguage(newLocale: string)`** — The sole logic function. Calls `changeLanguage` (i18n runtime), then `router.replace` to re-enter the same route with the updated `locale` param. Falls back to `router.push('/')` if the replacement fails. Fire-and-forgets `useSessionStore().persistLocalePreference(newLocale)` (intentionally **not** awaited).
- **Template** — A Vuetify `v-menu` whose activator button shows the current locale in uppercase (e.g. "EN") with a `Languages` icon, and whose list iterates over `supportedLanguages` (imported from `@/infrastructure/i18n`). The current locale gets a `Check` icon and `aria-current="true"`.
- **Imports from app shell**: `useRouter` / `useRoute` (vue-router), `useI18n` (vue-i18n), `changeLanguage` / `supportedLanguages` (`@/infrastructure/i18n`), `useSessionStore` (`@/infrastructure/stores/session.ts`), `Check` / `Languages` icons (lucide-vue-next).

## Relationships

No graph neighbors are registered for this file. It consumes the i18n runtime and session store purely as function/store calls (no component-level imports).

## Notes

- `persistLocalePreference` is **deliberately not awaited** — the UI must reflect the new language immediately; a failed persistence write must not roll back the visible switch.
- The component has no knowledge of auth state. Whether the locale preference is actually persisted server-side is the session store's concern.
- Accessibility: the activator's `aria-label` embeds the visible locale code (WCAG 2.5.3 — voice-control users say what they see). The list uses `role="menu"` / `role="menuitem"` rather than a `listbox`, since each item triggers an action rather than selecting a value.
- `data-test="language-switcher"` is the stable selector for E2E tests.
