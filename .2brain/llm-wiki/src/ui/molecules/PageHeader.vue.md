---
source: src/ui/molecules/PageHeader.vue
sha256: cd964d801f77dc6fb6225ac290573c85e3cf437680bbff57d5fb31b5b43b3984
generated_at: 2026-10-17T01:57:47.027639+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/PageHeader.vue

## Purpose

A self-contained page-hero `<header>` that a view renders at the top of its own body when its title is dynamic or richer than a simple translated `route.meta.title`. It was extracted from `LayoutDefault`'s `#header` slot after that layout became a route and lost the ability to accept per-view slot content.

## Key elements

- **`title` prop (optional `string`)** — Fallback text for the `<h1>` when the default slot is not provided.
- **Default slot** — When filled, it completely replaces the built-in `<h1>` + decorative gradient bar, allowing arbitrary rich markup.
- **Decorative bar** — A 4-px gradient rule (`primary → tertiary`) rendered below the title via the slot's fallback; marked `aria-hidden`.
- **Container constraints** — `max-w-[1280px]`, centered, with responsive vertical padding (`py-8 lg:py-10`).

## Relationships

No dependency-graph neighbors recorded. The component is a leaf: it imports nothing and is consumed by view components that set `meta.customHero: true` on their route to suppress `LayoutDefault`'s own header rendering.

## Notes

- **Mutual exclusion with `LayoutDefault`**: Rendering this component is the *view's* responsibility, not the layout's. The `meta.customHero` flag on the route is the contract that tells `LayoutDefault` to stay out of the header slot. Omitting the flag while also rendering this component would produce a duplicate hero.
- **Slot overrides everything**: Providing slot content suppresses both the `<h1>` and the gradient bar, not just one or the other. If you need a custom title but still want the bar, include it in the slot yourself.
- **No reactivity on `title`**: The prop is read once in the template; there is no computed/watch logic. Pass a reactive expression from the parent if the title changes.
