# docs/modules/products.md

## Purpose

Documents the **products** domain module — the four catalogue screens (public list, public detail, admin create, admin edit), its Pinia store, its ten API endpoints, and its wiring into the application shell. This page is the quick-reference for what the module owns, what it publishes to siblings, and where it draws its boundaries.

## Key elements

- **`store.ts` → `useProductsStore`** – The single Pinia store. State: `facets`, `products`, `selectedProductId`, `filters`, `pageCurrent`, `pageSize`. Getters: `productsList`, `currentProduct`, `loading`, `pageTotal`, `pageItemList`. Actions: `fetchFacets`, `fetchProducts`, `fetchPaginationProducts`, `watchSearchProducts`, `fetchProduct`, `watchProduct`, `createProduct`, `updateProduct`, `deleteProduct`, `hardDeleteProduct`, `addProduct`.
- **`index.ts`** – Public barrel; the *only* surface a sibling module may import.
- **`module.ts`** – The manifest the app loads directly. Declares routes, navigation entries, response schemas, dependency edges, and locales.
- **`routes.ts`** – Four route records (`ProductsList`, `ProductCreate`, `ProductTarget`, `ProductEdit`) spliced into the localised route tree.
- **`response-schemas.ts`** – One Zod envelope per endpoint (10 total), registered in the manifest for contract validation.
- **`schemas.ts`** – Form schemas built on the generated OpenAPI request schemas.
- **`views/`** – `ProductsList.vue`, `Product.vue` (detail), `ProductCreate.vue`, `ProductEdit.vue`.
- **`locales/en.json`, `locales/it.json`** – Per-language translation chunks.

## Relationships

The only graph neighbor listed for this page is **`docs/modules/orders.md`**. No direct dependency, import, or store interaction between `products` and `orders` is visible in this file's content. The module's actual runtime edges are to `cart` (customer-supplier: add-to-cart writes a line), `wishlist` (customer-supplier: the heart saves a product), and `inventory` (conformist: reads `useProductsStore` as-is for receipt and ledger labels).

## Notes

- **Stock is read-only here.** `onHand`, `reserved`, and `available` arrive serialized on every product object; no form in these four screens writes them. Changing stock is exclusively an `inventory` operation.
- **Static-before-dynamic routing.** `products/create` is declared before `products/:id` in `routes.ts`. vue-router ranks static segments above dynamic ones regardless of order, but the declaration order is the convention a reader should follow.
- **Conformist edge in from inventory.** `inventory` reads `useProductsStore` with no translation layer and no say in its shape. Changing the store's surface shape will break `inventory`.
- **Customer-supplier, not peer.** Products does not render cart or wishlist UI; it *asks* those stores to write. Their published surfaces are shaped by that demand.
- **Barrel discipline.** Sibling modules must import through `index.ts` only; importing `store.ts` or `routes.ts` directly bypasses the module boundary.
