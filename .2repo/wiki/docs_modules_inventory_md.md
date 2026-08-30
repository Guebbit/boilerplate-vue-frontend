# docs/modules/inventory.md

## Purpose

Documents the **inventory** module — a single admin screen (`InventoryLedger`) that displays stock levels and the full movement ledger behind them. It is a *supporting* subdomain (not a differentiator), intentionally kept plain, and acts as a read-mostly window onto server-side counter data. No other module depends on it.

## Key elements

- **`store.ts`** – Pinia store `inventory`. State: `movements`, `movementsTotal`, `levels`, `levelsTotal`. Getter: `loading`. Actions: `fetchMovements`, `fetchLevels`, `receive`, `adjust`, `sweep`.
- **`views/InventoryLedger.vue`** – The sole routed screen (path `inventory`, route name `InventoryLedger`, access `admin`). Renders the board + ledger; holds no fetching logic of its own.
- **`module.ts`** – Manifest: declares name, routes, nav entries, response schemas, dependency edges, and locales (`en`, `it`). The only file the app loads directly.
- **`response-schemas.ts`** – One Zod envelope per endpoint (5 total), registered via the manifest for contract validation.
- **`routes.ts`** – Route records spliced into the localised route tree; each carries its own `meta.access`.
- **`locales/{en,it}.json`** – Per-language translation chunks.
- **`tests/`** – 1 Vitest suite (store/rules), 2 Cypress suites (a11y, visual), 1 committed visual baseline.

## Relationships

- **→ `products`** (conformist): Reads `useProductsStore` as-is to label products in the receipt select and ledger titles. No translation, no shape influence. One-way arrow mirroring the backend's own `inventory → products` edge.
- **← nothing**: No barrel export, no sibling imports this module. It is a leaf in the dependency graph.
- **Parent pages**: Listed under `docs/modules/index.md` (module overview) and reachable from `docs/index.md`.

## Notes

- **Unbounded reads**: Neither the levels board nor the ledger is paginated client-side. The ledger is an audit record, so showing only the newest rows would misrepresent completeness.
- **Server-side sort**: The board sorts on *availability* (a derived field, not stored), so the server performs the aggregation sort; the client does not load the catalogue to sort in memory.
- **Clean removal**: Deleting this module removes the view only. All counters and movements live server-side and keep being written; the "why" simply becomes invisible to this app.
- **Access control**: The `admin` gate lives on the route's `meta.access`; menu entries never restate it, preventing menu/router drift.
- **Regenerate after backend changes**: Run `npm run regenerate` if any of the 5 endpoints change shape.
