---
source: tests/unit/app/app-navigation.spec.ts
sha256: 6b3579e5cc0fc43f73969c1513ddc7f1ec4d1ec70fe58ed3a91730c58842089e
signature: 8c7418349aa146b97effc1b7e9f682331bfd96f6a8359a2ddafeb3fa30639482
generated_at: 2026-11-10T07:44:09.090513+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/app-navigation.spec.ts

## Purpose

Unit test for the `AppNavigation` shell component. It verifies the core invariant that a nav entry is rendered **iff** the resolved route's `meta.access` (and `can` permission) would let the current visitor enter that route — without carrying any independent visibility flag. It also asserts ordering by `order`, section placement (bar / account menu / admin menu), pinned-entry promotion, and badge rendering.

## Key elements

- **Mocked `@/modules`** — Three invented domains (`staff-domain`, `public-domain`, `member-domain`) provide the navigation entries. They deliberately cover the three visibility classes (public, auth, permission-gated) and the three UI sections, and use out-of-sequence `order` values to exercise sorting.
- **`routeAccess` / `routePermission`** — Lookup maps keyed by route name that `router.resolve` (mocked) returns as `meta`. `undefined` access means public.
- **`session`** — Minimal Pinia-store stub exposing `isAuth`, `viewer`, and a `can(action, subject)` that checks the reactive `held` ref against `"action subject"` strings.
- **`registeredRoutes`** — Controls which auth route names (`Login`, `Signup`) `router.hasRoute` reports, modelling the "no account module in this build" case.
- **`mountNav(contributions?)`** — Mounts `AppNavigation` with Pinia, Vuetify, stubs for `VAppBar`/`VNavigationDrawer`/`VMenu`/`VTooltip`, and optional slot contributions; returns `{ wrapper, text }`.
- **`isHidden(wrapper, label)`** — Asserts a control is **absent from the DOM** (not merely `v-show`-hidden), guarding against leftover tab-order nodes.
- **`Glyph`** — Hoisted stub component (`aria-hidden` SVG) standing in for lucide icons.
- **`pushSpy` / `replaceSpy`** — Shared spies for `router.push` / `router.replace` so click-navigation tests can assert on the target.
- **`describe('Navigation', …)`** — Top-level suite; `beforeEach` resets auth state, `held`, `registeredRoutes`, `currentRoute`, and badge/detail refs.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The file intentionally mocks `@/modules` rather than importing the real registry, so that deleting or adding a domain module never breaks this test. The "every entry points at a route the module actually declares" invariant lives in `tests/cross-cutting/registry.spec.ts`.
- `vi.hoisted` is used for `Glyph` and the `drafts` Set because `vi.mock` factory code runs before the file body, so these must not depend on module-scope `const`s declared later.
- `attachTo: document.body` is required so that `focus()` actually moves the active element in jsdom; without it, keyboard-focus assertions would be vacuous.
- The i18n mock returns `key` (or `` `${key}:${count}` ``) so tests can assert on the exact label key rendered, without depending on any locale file content.
- `VMenu` and `VTooltip` stubs render both their activator and content unconditionally, letting tests read menu entries without simulating a click to open the overlay.
