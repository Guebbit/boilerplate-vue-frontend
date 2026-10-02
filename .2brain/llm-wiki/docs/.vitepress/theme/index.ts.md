---
source: docs/.vitepress/theme/index.ts
sha256: 8616d6a28c75f92010153f385cefdfa2795a27c864bf0abf498e618ab668d482
generated_at: 2026-10-02T11:23:09.863388+00:00
model: ollama:qwen3.8:27b
---

# docs/.vitepress/theme/index.ts

## Purpose

Custom VitePress theme that extends the default theme to add a click-to-zoom overlay for Mermaid diagrams rendered in the documentation. Because VitePress hydrates content after initial render, a `MutationObserver` is used to attach zoom behavior to newly inserted diagram elements.

## Key elements

- **`openOverlay(container)`** — Clones the SVG inside a `.mermaid` container, appends it to a full-screen overlay `<div>` (with ARIA dialog semantics), triggers a CSS transition, and wires up close handlers (backdrop click, Escape key). The SVG is stripped of fixed `width`/`height` attributes so it scales within the overlay.
- **`attachToUnprocessed()`** — Iterates all `.vp-doc .mermaid` elements, skips those already marked with `data-zoom-attached`, and binds a single `click` listener per element that calls `openOverlay`.
- **`export default { extends: DefaultTheme, enhanceApp }`** — The VitePress theme object. `enhanceApp` guards for SSR (`globalThis.window === undefined`), then starts a `MutationObserver` on `document.documentElement` (`childList` + `subtree`) that invokes `attachToUnprocessed` on every DOM mutation.
- **`./custom.css`** (imported) — Provides the `.mermaid-zoom-overlay` styles and the `mermaid-zoom-active` body class transition.

## Relationships

No graph neighbors detected. The only external dependency beyond `vitepress` itself is the sibling `./custom.css` stylesheet.

## Notes

- The observer is intentionally **never disconnected**; it runs for the lifetime of the SPA session. This is acceptable for a docs site but would be a leak in a long-lived app.
- `overlay.getBoundingClientRect()` is called solely to force a synchronous reflow so the `--visible` class transition actually animates.
- The zoom handler is idempotent per element thanks to the `data-zoom-attached` guard, so repeated `MutationObserver` callbacks are safe.
- Clicking the SVG inside the overlay does **not** close it—only clicks where `e.target === overlay` (i.e. the dark backdrop) or the Escape key trigger dismissal.
