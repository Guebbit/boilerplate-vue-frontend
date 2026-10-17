---
source: tests/unit/app/app-navigation.spec.ts
sha256: 64d807608490dae49f9b0c856c7e45a7afa449420df0373ad83f7fecafedcc30
generated_at: 2026-10-17T02:29:52.383653+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/app-navigation.spec.ts

## Purpose

Unit tests for `AppNavigation.vue` that verify the component filters and renders navigation entries based solely on the resolved route's `meta.access` and permission, rather than any independent visibility flag. The spec asserts that entries appear in the correct section (bar, account, admin), are ordered by `order`, respect auth/permission gates, and that hidden entries are fully absent from the DOM (not merely `v-show`-hidden) to preserve tab-order accessibility.

## Key elements

- **`held` / `session`** — Reactive refs and a mock session store whose `can(action, subject)` checks a flat list of `"action subject"` strings, replacing CASL with a simple permission lookup.
- **`registeredRoutes`** — Controls whether `Login`/`Signup` routes exist, exercising the shell's `router.hasRoute` guard for auth links.
- **`routeAccess` / `routePermission`** — Maps route names to `RouteAccess` and `RoutePermission` values, fed into the mocked `router.resolve` so the nav's filtering logic is exercised without real routes.
- **`memberCount` / `pinnedCount` / `pinnedDetail`** — Reactive badge and detail values for the member and pinned entries.
- **`Glyph`** — A hoisted stub SVG component standing in for a lucide icon, rendered `aria-hidden`.
- **`vi.mock('@/modules', …)`** — Replaces the real module registry with three throwaway domains (`staff-domain`, `public-domain`, `member-domain`), one per visibility class and one per section, with deliberately out-of-sequence `order` values to exercise sorting.
- **`vi.mock('vue-router', …)`** — Stubs `RouterLink`, `useRoute`, and `useRouter` (including `resolve`, `hasRoute`, `push` spy).
- **`vi.mock('vue-i18n', …)`** — Wraps the real module, replacing `useI18n` with a `t` that echoes the key (appending `:count` for plural calls) and a `te` that always returns `true`.
- **`mountNav(contributions?)`** — Mounts `AppNavigation` with Pinia, Vuetify, slot provide, and Vuetify component stubs (`VAppBar`, `VNavigationDrawer`, `VMenu`, `VTooltip` rendered unconditionally so menu content is assertable without clicks); attaches to `document.body` for focus tests.
- **`isHidden`** — Helper asserting an entry is *absent* from `header a, header button` (not merely hidden), guarding against tab-order leaks.
- **`describe('Navigation', …)`** — Test cases covering: guest sees only public entries; authenticated user sees member entries but not admin; admin-permission filtering; ordering; pinned entry rendering with badge/detail; group headings; language switcher presence; and navigation-push behavior.

## Relationships

No graph neighbors are listed for this file.

## Notes

- The mock modules are **invented on purpose**: asserting against the real registry would couple a platform-level spec to domain names, violating the separation described in `docs/theory/modules.md` ("Deleting a domain"). The invariant that every real module's entry points to a route it declares lives in `tests/cross-cutting/registry.spec.ts`.
- `vi.mock` calls execute before the file body, so any value they reference (e.g. `Glyph`, `memberCount`, `routeAccess`) must be defined via `vi.hoisted` or as module-level `ref`s declared before the mock factories.
- `pushSpy` is a single shared `vi.fn()` rather than a fresh spy per `useRouter()` call, so click tests can assert what the component actually invoked.
- `VAppBar` is stubbed to a plain `<header>` because the real component teleports into a `v-app` layout that does not exist in the test DOM.
- `VMenu` and `VTooltip` stubs render their default slot unconditionally (no open/close state), making menu contents assertable without interaction.
- The file is truncated in the provided content; additional test cases beyond the first two `it` blocks exist but are not visible here.
