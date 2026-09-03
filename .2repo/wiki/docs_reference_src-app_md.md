# docs/reference/src-app.md

## Purpose

Catalogs every file that is **not** a domain module: the boot sequence (`src/main.ts`), the root component, the module enable list, the kernel registry, the application shell (router, guards, layouts, navigation components, static views), and the shared type definitions. It exists as a single lookup point for the "chrome around the domains" so a reader never has to infer which file owns a concern.

## Key elements

- **`src/main.ts`** – Boot sequence; the only file that knows plugin install order (Pinia, router, vue-i18n, Vuetify, observability) and the mount call.
- **`src/App.vue`** – Root component; intentionally contains only `<RouterView />` so no domain state is stranded at the top.
- **`src/modules.ts`** – Explicit array of enabled domains (one import + one entry each); no filesystem discovery.
- **`src/kernel/registry.ts`** – Defines the typed shape of a module (name, routes, store, locales, navigation) and validates the set at boot.
- **`src/app/router/index.ts`** – Builds the Vue router from the registry; names no domain directly.
- **`src/app/router/navigation.ts`** – Unauthenticated redirect target and the shell's nav entry list.
- **`src/app/guards/authentications.ts`** – Per-route access rule; absence means public.
- **`src/app/guards/locale-choice.ts`** – Resolves the locale for the entered route and assembles its dictionary.
- **`src/app/layouts/LayoutDefault.vue`** – Default page chrome (header, hero, nav, footer).
- **`src/app/components/AppNavigation.vue`** – Assembles the labelled bar, account/admin menus, pinned buttons, and phone drawer from registry navigation entries grouped by `section`.
- **`src/app/components/AppNavBarLink.vue` / `AppNavPinnedButton.vue`** – Individual desktop-bar entries with glyph, label, optional badge, and accessible name.
- **`src/app/components/AppNavMenu.vue`** – Dropdown menu with `role="menu"` / `menuitem` on top of Vuetify keyboard handling.
- **`src/app/components/AppNavIconButton.vue`** – Icon-only activator; accessible via `aria-label` + Escape-dismissable tooltip.
- **`src/app/components/AppLanguageSwitcher.vue`** – Switches locale by re-entering the current route under the new locale (URL carries locale).
- **`src/app/components/AppHealthBanner.vue`** – Banner shown only when the API is unreachable.
- **`src/app/views/Home.vue` / `Error.vue` / `AboutPage.vue` / `FaqPage.vue`** – Landing, catch-all/404, and the two static prose pages (copy under `static-pages.*` keys).
- **`src/types/`** – Shared type definitions (content truncated in source).

## Relationships

- **→ `docs/theory/architecture.md`** – The dependency axis (`infrastructure → kernel → modules → app`) and the `eslint.config.ts` enforcement are introduced here; this page points readers to that theory doc for the full model.
- **→ `docs/theory/modules.md`** – The registry, the module enable list, and `App.vue`'s deliberate emptiness all rest on the module contract defined there.
- **→ `docs/theory/module-lifecycle.md`** – "Enabling or disabling a domain is one line in `src/modules.ts`" is the entry point that lifecycle doc expands.
- **→ `docs/theory/sitemap.md`** – Navigation sections, per-route access, and static-page cross-links are all governed by the sitemap rules this page's components implement.
- **→ `docs/theory/strategic-ddd.md`** – The registry is described as "the thesis of the repository"; the strategic DDD doc explains why a typed value replaces a folder convention.
- **→ `docs/theory/reading-path.md`** – `main.ts` is the first stop on the recommended reading path.
- **→ `docs/reference/src-infrastructure.md`** – `locale-choice.ts` and `AppLanguageSwitcher.vue` depend on the i18n/override layer documented there.
- **→ `docs/tools/accessibility-testing.md`** – `AppNavIconButton.vue`'s `aria-label` + tooltip pattern is verified by the accessibility test suite.

## Notes

- **No filesystem discovery.** Adding a module requires an explicit import in `src/modules.ts`; there is no auto-scan. Forgetting the import silently excludes a domain.
- **Access is opt-in per route.** An absent guard means the route is public; do not infer access from the route hierarchy.
- **Navigation is registry-driven, not hand-written.** `AppNavigation.vue` groups entries by `section`; adding a nav item means adding a registry entry, not editing a component.
- **Language switch is a navigation, not a state mutation.** Because the URL carries the locale, `AppLanguageSwitcher` re-enters the current route rather than calling `i18n.locale` in place.
- **`App.vue` must stay near-empty.** Placing state or UI here would couple the shell to a domain and defeat the "delete a domain, nothing breaks" guarantee.
