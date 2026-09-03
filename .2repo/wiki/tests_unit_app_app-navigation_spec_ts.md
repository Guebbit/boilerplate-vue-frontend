# tests/unit/app/app-navigation.spec.ts

## Purpose

Unit test for `AppNavigation.vue` that pins the core visibility invariant: a nav entry appears **exactly when** the router would permit entry to its target route (via `meta.access`). It uses three throwaway mock domains—one per section (main, account, admin) and one per access class (public, auth, admin)—so the test exercises the *mechanism* (filter by access, sort by `order`, place in section) without coupling to any real domain name. Deleting a real domain must never break this file.

## Key elements

- **`mountNav()`** — mounts `AppNavigation` with Pinia, Vuetify, and stubs for `VAppBar`, `VNavigationDrawer`, `VMenu`, `VTooltip`; attaches to `document.body` so focus tests work under jsdom.
- **`isHidden(wrapper, label)`** — asserts a control is *absent from the DOM* (v-if), not merely hidden (v-show), guarding against tab-order accessibility defects.
- **Mocked `@/modules`** — three invented domains (`staff-domain`, `public-domain`, `member-domain`) with `order` values deliberately out of declaration sequence so the sort is actually exercised. `member-domain` also contributes a **pinned** entry with `badge` and `detail` accessors.
- **Mocked `vue-router`** — `useRouter().resolve` returns `meta.access` from a `routeAccess` map; `hasRoute` reads a mutable `registeredRoutes` ref to simulate builds with/without the account module.
- **Mocked `@/infrastructure/session.ts`** — exposes reactive `isAuth`, `isAdmin`, `viewer` for visibility assertions.
- **Mocked `vue-i18n`** — `t` echoes the key (appending `:count` for plural calls) so labels are assertable.
- **Test cases** — cover: guest sees public only; auth adds member entries; admin adds staff entries; ordering by `order` within a section; section order (main → account → admin); login/signup offered when routes registered; login/signup **removed** (not hidden) when visitor is already on that route by *name*; both buttons remain on a route that merely *contains* the word "login".

## Relationships

The file has no registered graph neighbors. It imports (and mocks) the component under test (`@/app/components/AppNavigation.vue`), the Vuetify plugin (`@/ui/vuetify`), and the `RouteAccess` type (`@/app/guards/authentications`). It defers the "every real module links to a route it declares" invariant to `tests/cross-cutting/registry.spec.ts` (referenced in comments, not imported).

## Notes

- `vi.mock('@/modules', …)` and `vi.mock('vue-router', …)` execute **before** the file body, so the `Glyph` component used inside the mock is defined via `vi.hoisted`.
- `registeredRoutes` is a mutable `ref`; tests flip it to `[]` to simulate a build without the account module, which removes both login and signup buttons.
- The `order` values (30, 60, 65, 90, 95) are intentionally non-sequential with registration order so that "accidentally correct by declaration order" cannot mask a broken sort.
- `VMenu` and `VTooltip` stubs render their default slot unconditionally, so menu contents are assertable without simulating a click to open.
- The file references `docs/theory/modules.md` ("Deleting a domain") as the rationale for using invented modules.
