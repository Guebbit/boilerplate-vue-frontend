# src/modules/wishlist/index.ts

## Purpose

Public barrel (entry point) for the wishlist module. It re-exports `useWishlistStore` so that sibling modules (notably `products`) can access the store's heart-toggle API without reaching into the module's internal file layout.

## Key elements

- **`export { useWishlistStore } from './store'`** — The single public export. Sibling modules import the store through this barrel rather than directly from `./store`.

## Relationships

- **`src/modules/wishlist/store.ts`** — Sole dependency. This barrel re-exports `useWishlistStore` from that file; no other symbols are re-exported.

## Notes

- By convention this is the *only* file external modules should import from for wishlist functionality. Importing `./store` directly from outside the module is discouraged.
- The doc comment clarifies a design intent: the products module calls into the store for the heart toggle on product detail pages; saving a product is not limited to the wishlist's own page.
