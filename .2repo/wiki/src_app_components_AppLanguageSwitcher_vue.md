# src/app/components/AppLanguageSwitcher.vue

## Purpose

A Vuetify dropdown menu that lets the user switch the app's display language. The component is intentionally narrow in scope: it handles **only** the routing side of a locale switch (re-entering the current route under the new `locale` param). Dictionary loading is delegated to the i18n runtime and locale persistence to the session store.

## Key elements

- **`switchLanguage(newLocale: string)`** — Core action. Calls `changeLanguage(newLocale)` (i18n runtime), then `router.replace` on the same route with the updated `locale` param and preserved query. Falls back to `router.push('/')` on navigation failure. Fires `useSessionStore().persistLocalePreference(newLocale)` *without* awaiting it.
- **`supportedLanguages`** (from `@/infrastructure/i18n`) — Drives the `v-for` loop that renders one `v-list-item` per available locale.
- **`changeLanguage`** (from `@/infrastructure/i18n`) — Loads/activates the dictionary for the chosen locale; called inside the promise chain before routing.
- **`useSessionStore().persistLocalePreference`** (from `@/infrastructure/session.ts`) — Writes the user's locale choice (fire-and-forget; not awaited).
- **Template** — A `v-menu` with a `v-btn` activator (shows current locale code, e.g. "EN") and a `v-list` (`role="menu"`) of language options. Uses `lucide-vue-next` icons (`Languages`, `Check`).

## Relationships

- **`@/infrastructure/i18n`** — Provides `changeLanguage` (dictionary loading) and `supportedLanguages` (list of valid locale codes). This component calls `changeLanguage` synchronously in its promise chain and reads `supportedLanguages` for rendering.
- **`@/infrastructure/session.ts`** — Provides `useSessionStore()` whose `persistLocalePreference` method is invoked (non-blocking) to remember the choice.
- **`vue-router`** — `router.replace` / `router.push` perform the actual navigation; `route.params` and `route.query` are carried over.
- **`vue-i18n`** — `t()` for UI strings; `locale` reactive ref for the current locale code.

## Notes

- `persistLocalePreference` is **deliberately not awaited**. The UI must reflect the new language immediately; a failed persistence write must not roll back the switch.
- The component has **no knowledge of auth state**. It always calls the session store; whether the write is meaningful (signed-in vs. anonymous) is the store's concern.
- The activator button's `aria-label` includes the visible text (current locale code) in addition to the translated label, per WCAG 2.5.3 (label in name) for voice-control users.
- The `v-list` uses `role="menu"` / `role="menuitem"` (a menu, not a listbox) because selecting an item is an action, not a selection.
- Navigation failure in `switchLanguage` degrades to `router.push('/')`, which implicitly recalculates the locale param via route resolution.
