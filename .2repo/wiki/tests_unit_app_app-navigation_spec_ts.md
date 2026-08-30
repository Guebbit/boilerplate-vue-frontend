# tests/unit/app/app-navigation.spec.ts

## Purpose

Unit spec for the `AppNavigation` component. It pins the visibility invariant (an entry renders only when the router would permit the visitor to enter the route it links to), the `order`-based sort within each section, the kernel section sequence (main → account → admin), and the conditional sign-in/sign-up buttons. All domain modules are mocked so the test stays decoupled from any specific domain.

## Key elements

- **`vi.mock('@/modules', …)`** — Replaces the real registry with three invented domains (`staff-domain`, `public-domain`, `member-domain`), one per visibility class (`admin`/`auth`/public) and one per section. `order` values are deliberately non-sequential to exercise sorting.
- **`vi.mock('vue-router', …)`** — Provides a controllable `useRoute`, a `useRouter.resolve` that reads `routeAccess`, and a `hasRoute` driven by `registeredRoutes`.
- **`vi.mock('vue-i18n', …)`** — `t(key, count?)` echoes the key (appending `:count` for plurals) so labels are assertable strings.
- **`vi.mock('vue-i18n')` / `vi.mock('vue-router')` / `vi.mock('@/modules')` / `vi.mock('@/infrastructure/stores/session.ts')`** — Together they isolate the component from real infrastructure.
- **`session`** — Reactive refs (`isAuth`, `isAdmin`, `viewer`) injected via the mocked session store.
- **`registeredRoutes`** — Controls whether `Login`/`Signup` routes exist in the "build."
- **`currentRoute`** — Simulates the active route for the "hide button while on that page" tests.
- **`routeAccess`** — Maps route names to `RouteAccess` (`undefined` | `'auth'` | `'admin'`).
- **`Glyph`** (`vi.hoisted`) — Minimal `<svg aria-hidden>` stand-in for a lucide icon; hoisted because `vi.mock` factories read it eagerly.
- **`mountNav()`** — Mounts `AppNavigation` with Pinia, Vuetify, and stubs for `VAppBar`, `VNavigationDrawer`, `VMenu`, `VTooltip`; attaches to `document.body` for focus semantics.
- **`isHidden(wrapper, label)`** — Asserts a control is *absent from the DOM* (not merely `v-show`-hidden), guarding against stray tab-order entries.
- **`describe('Navigation', …)`** — Test cases covering: guest vs. auth vs. admin visibility, ordering, drawer section sequence, sign-in/sign-up presence/absence, route-name (not substring) hiding, empty-module shell fallback, and link-vs-button semantics.

## Relationships

No graph neighbors are listed. The sole real import is the component under test (`@/app/components/AppNavigation.vue`); every other dependency (`@/modules`, `vue-router`, `vue-i18n`, session store, Vuetify) is either mocked or provided as a plugin/stub during mount.

## Notes

- **Why modules are invented:** Naming real domain modules (`products`, `cart`, `admin`) in a platform spec would couple the test to domains that can be deleted independently. The real-registry invariant (every entry points at a declared route) lives in `tests/cross-cutting/registry.spec.ts`.
- **`vi.hoisted` for `Glyph`:** `vi.mock` factories execute before the file body; a plain `const` would be `undefined` at that point.
- **`isHidden` checks absence, not visibility:** A `v-show`-hidden button remains in the tab order. The helper asserts the element is not in the DOM at all.
- **Route-name vs. substring:** Hiding Login/Signup uses `route.name` equality, not a path substring match, so `/en/products/login-adapter` does not suppress the button.
- **`attachTo: document.body`:** jsdom ignores `focus()` on detached nodes; this is required for any future focus-order assertions.
- **i18n plural echo:** `t('key', 1)` returns `'key:1'`, letting tests distinguish plural forms without a real i18n backend.
