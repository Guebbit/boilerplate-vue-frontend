# src/ui/organisms/CardInfo.vue

## Purpose

A small presentational "info card" organism that displays a themed gradient icon tile alongside a title and description. It exists to give a consistent, theme-aware visual block for feature highlights or summary sections.

## Key elements

- **Props** — `title: string`, `description: string`, `variant?: ThemeAccent` (defaults to `'primary'`).
- **`variantClass` (computed)** — Maps the `variant` prop to a set of Tailwind utility classes (`bg-gradient-to-br from-* to-*` + `text-on-*`) using Vuetify theme CSS custom properties (`--v-theme-{accent}-darken-1`) for the gradient's darker stop. Falls back to the `primary` entry.
- **`icon` slot** — Named slot that accepts a custom icon component; defaults to `<Info :size="28" />` from `lucide-vue-next`.
- **Template** — Renders a `<v-card>` with a fixed `grid-cols-[84px_1fr]` layout: the 84×84 px rounded tile on the left, the text column on the right.

## Relationships

- **`@/ui/types.ts`** — Imports the `ThemeAccent` union type used to type the `variant` prop and key the `variantClass` map.
- **Vuetify theme system** — Gradient endpoints reference `--v-theme-{accent}-darken-1` CSS variables produced by the Vuetify `variations` config; the component depends on those variables being present at runtime.

## Notes

- The component is purely presentational — no events, no v-model, no internal state.
- `variantClass` is the only computed; if a new accent is added to `ThemeAccent`, a matching entry must be added here (there is no catch-all).
- The icon tile carries `aria-hidden="true"`, so the default `Info` icon is decorative; a slotted icon should follow the same convention or provide its own accessible label externally.
