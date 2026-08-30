---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: public/
files: 5
updated: 2026-08-30T17:08:23.742219+00:00
---

# public/

## Purpose

`public/` is a static-asset directory that holds the project's brand-identity files (logos, favicons) and a single UI fallback graphic. These files are served verbatim to browsers and are not processed by any build step or runtime code.

## Key parts

- **Brand logos** (`images/guebbit-logo-colored.svg`, `images/guebbit-logo.svg`, `images/guebbit-logotype.svg`) — The "G" mark in color, the same mark in black-and-white, and a horizontal text-plus-mark lockup. Together they cover every rendering context (banners, inline UI, print, accessibility) for the guebbit brand.
- **Favicon** (`favicon/safari-pinned-tab.svg`) — A single-path, potrace-traced icon shown in the Safari tab bar when the site is pinned.
- **UI placeholder** (`images/no-image-placeholder.svg`) — A neutral-gray landscape glyph used by the front-end as a fallback when a content item has no real image, preventing broken-link or blank-space rendering.

## How it connects

This module has **no runtime or build-time dependencies**. It is a pure leaf in the dependency graph: other modules (HTML templates, CSS, or component code) reference these files by URL, but nothing inside `public/` imports or loads code from elsewhere. Conversely, no other module's behavior changes if a file here is added or removed; the effect is purely visual.

## Where to start

1. **`images/guebbit-logo-colored.svg`** — It is documented as the canonical scalable source for the brand's color identity. Understanding the logo's layers and structure makes the B&W and logotype variants trivial to compare.
2. **`images/no-image-placeholder.svg`** — This is the one asset with a direct functional role in the UI (fallback rendering). Reading its small, simple SVG source is a quick way to see how the project structures a static image asset and how the front-end is expected to reference it.

## Connected modules
_(none)_

## Files
- `public/favicon/safari-pinned-tab.svg` — A black-and-white vector icon used as the **Safari pinned-tab** favicon. When a user pins this site in Safari, this SVG replaces the default globe in the tab bar. It is a potrace-traced version of the project logo, rendered as a single filled path.
- `public/images/guebbit-logo-colored.svg` — The primary colored brand logo for guebbit, rendered as a two-layer vector "G" mark. It exists as the canonical scalable source for the brand's color identity, referenced wherever a crisp, resolution-independent logo is needed (banners, favicons, print exports).
- `public/images/guebbit-logo.svg` — Black-and-white vector logo for the guebbit brand. Renders a stylized "G" mark used as the primary visual identity on web pages. Contains embedded descriptive metadata for accessibility/SEO context.
- `public/images/guebbit-logotype.svg` — The horizontal "long" logotype for the guebbit brand, rendered entirely as vector paths. It is the scalable text-plus-mark lockup used where an SVG is needed (e.g. favicons, inline UI, print), complementing the raster PNG for contexts that require a fixed-pixel or colored variant.
- `public/images/no-image-placeholder.svg` — A static SVG icon used as a fallback/placeholder when no actual image is available. It renders a simple landscape glyph (rounded frame, sun, mountain ridge) in a neutral gray so the UI still shows a recognizable "image" shape instead of a blank space or broken-link icon.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
