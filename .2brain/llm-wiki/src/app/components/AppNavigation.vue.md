---
source: src/app/components/AppNavigation.vue
sha256: f149a7a216aaaaa7e696a51a7de278903bc7850f9a675ccc37c4f2a6c8cd92f2
generated_at: 2026-10-17T00:05:06.297038+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavigation.vue

## Purpose

Renders the app shell's top navigation bar (desktop) and right-hand drawer (mobile). It merges the shell's own two entries with contributions from every enabled module (via the kernel registry), filters each section through `canAccess`, and produces the visible bar links, the account/admin dropdowns, the `pinned` standalone buttons, and the mobile drawer — all in one component.

## Key elements

- **`shellNavEntries`** – The two nav items the shell owns (Home, StaticAbout). Spaced by tens in `order` so module entries can interleave.
- **`navSections`** – Result of `groupNavigation(shell + module entries)`, keyed by `main | account | admin`.
- **`badgeCounts` / `badgeDetails`** – `Map` objects materialised **once** (not inside a computed) so that accessor side-effects (watchers, fetches) are armed a single time.
- **`visibleSections`** – Computed that filters each section through `canAccess(router.resolve(name).meta, visitor)`, localises labels, and resolves `to` via `routerLinkI18n`. Returns `Record<AppNavigationSection, AppNavItem[]>`.
- **`pinnedItems` / `menuItems`** – Splits account+admin entries into standalone bar buttons (`pinned`) vs. dropdown rows (the rest), preventing double-display.
- **`accountBadge`** – The first unpinned account entry that carries a badge; shown on the closed-menu activator.
- **`hasSignIn` / `hasSignUp`** – Computed booleans using `router.hasRoute(...)` so a build without the account module simply omits auth buttons.
- **`logout`** – Pushes to the `Logout` route, or falls back to `Home` when the route does not exist.
- **`toggleTheme`** – Flips Vuetify's dark/light mode and persists via `writeThemePreference`.
- **`drawer` + focus watcher** – Opens/closes the mobile drawer; on open, focuses the first focusable child; on close, returns focus to the hamburger (WCAG 2.4.3). Uses `nextTick` because drawer content renders after the flag flips.
- **`appBarSlot`** – `useSlot('app-bar')` for module contributions rendered inline in the bar (e.g. the notifications bell).
- **Template** – `v-app-bar` with prepend logo, desktop `<nav>` of `AppNavBarLink` items, `<slot>` for center content, and `<template #append>` containing `nav-right` slot, slot components, `AppNavMenu` for admin/account, theme toggle, language switcher, and the mobile drawer.

## Relationships

No graph neighbors are listed for this file in the dependency graph.

## Notes

- **Materialise-once rule:** `badgeCounts` and `badgeDetails` are plain `Map`s built at setup time, *not* computed properties. Re-running the accessors inside a computed would re-arm watchers and re-fire fetches on every recompute.
- **`||` vs `??`:** Badge and detail values use `|| undefined` (not `??`) so that a legitimate `0` renders as *no* badge rather than a "0" chip. An eslint-disable comment documents this.
- **No per-entry visibility flag:** Access is always derived from the resolved route's `meta` via `canAccess`, so the menu mirrors exactly what the router would permit. A section whose entries are all inaccessible produces an empty list, and the corresponding chrome (menu, drawer heading) simply does not render.
- **Domain-agnostic:** The shell references no specific module. Adding or removing a domain module changes the nav automatically through `collectModuleNavigation(enabledModules)`; no shell edit is required.
- **Route-name strings:** `SIGN_IN_ROUTE_NAME`, `SIGN_UP_ROUTE_NAME`, `'Logout'`, and `'Home'` are plain strings with no compile-time guarantee they resolve. The code guards with `router.hasRoute(...)` before navigating.
- **`plural` is optional** on `AppNavigationEntry`; the fallback is `1` (singular), matching pre-existing entries that predate the field.
