# src/app/views/Home.vue

## Purpose

Landing page component for the app shell. Renders a static hero call-to-action and a three-card showcase grid, all fully i18n-driven. It exists as the default entry view that users see before navigating into any domain module.

## Key elements

- **`HomePage`** (default export) — the registered component name.
- **`hasProductsList`** (computed) — checks `router.hasRoute('ProductsList')` to decide whether the hero CTA button renders. This is the sole cross-domain reference in the shell.
- **`featuredProducts`** (computed) — returns three static showcase entries (title, description, theme variant, lucide icon) re-translated on locale change. Consumed by the `CardInfo` grid.
- **Template** — uses `LayoutDefault` wrapper, a Vuetify `v-card` hero, and a responsive `CardInfo` grid. The CTA `v-btn` is conditionally rendered via `v-if="hasProductsList"`.
- **Scoped style `.hero-card`** — radial-gradient background driven by Vuetify theme CSS variables (`--v-theme-primary`, `--v-theme-secondary`, `--v-theme-surface`).

## Relationships

- **`src/kernel/registry.ts`** — indirect: the registry (via `src/modules.ts`) is responsible for registering or omitting the `ProductsList` route. `hasProductsList` reads the *result* of that registration at runtime; no direct import exists in this file.

## Notes

- The `ProductsList` route name is a **string literal**, not a typed token. Removing the products module from the registry silently disables the CTA; neither the compiler nor the type-checker will flag the dangling reference. The `hasRoute` guard is the only safety net.
- All user-facing text is i18n-keyed under the `home-page.*` namespace; there are no hardcoded strings in the template.
- The component uses two `<script>` blocks: a plain options block for `name` and a `<script setup>` block for logic. Adding new logic should go in the setup block.
