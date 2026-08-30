# docs/.vitepress/theme/index.ts

## Purpose

VitePress custom theme entry point that extends the default theme to add a click-to-zoom overlay for Mermaid SVG diagrams. It also imports project-specific stylesheet (`./custom.css`). The file exists so that dynamically-rendered Mermaid charts (which appear after hydration) still receive a zoom interaction without requiring a per-component hook.

## Key elements

- **`openOverlay(container)`** – Clones the target `<svg>` into a fixed-position overlay (`div.mermaid-zoom-overlay`), forces a reflow to trigger the CSS fade-in transition, and wires up close-on-backdrop-click and Escape-key handlers.
- **`attachToUnprocessed()`** – Iterates `.vp-doc .mermaid` elements, skips any already tagged (`data-zoom-attached`), and binds a single click listener that calls `openOverlay`.
- **Default export (theme object)** – `{ extends: DefaultTheme, enhanceApp }`. The `enhanceApp` hook guards against SSR (`globalThis.window === undefined`) and registers a `MutationObserver` on `<html>` so that newly-inserted Mermaid containers are automatically processed.

## Relationships

No other project files import from or are imported by this module in the dependency graph. It is the single VitePress theme entry configured in `vitepress.config.ts` (or equivalent) and depends only on the `vitepress` package and a sibling `custom.css`.

## Notes

- **MutationObserver, not `onMounted`:** The zoom handler is attached via a live DOM observer because VitePress renders Mermaid SVGs asynchronously (often via a client-side script). A one-time `querySelectorAll` at mount time would miss charts rendered later.
- **`data-zoom-attached` guard:** Prevents double-binding if the observer fires multiple times for the same node.
- **Reflow trick:** `overlay.getBoundingClientRect()` is called before adding the `--visible` class to ensure the CSS transition actually animates rather than jumping to the end state.
- **SSR guard:** `enhanceApp` is defined in the theme object (which is evaluated server-side by VitePress) but bails out early when `window` is absent; the observer is only created in a real browser context.
- **Accessibility:** The overlay carries `role="dialog"` and an `aria-label`; Escape closes it, matching expected dialog behavior.
