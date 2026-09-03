# src/ui/composables/use-server-page-total.ts

## Purpose

A shared Vue composable that supplies a server-authoritative `pageTotal` (from `meta.totalPages`) for stores whose `search:` calls a real paginated endpoint. It exists because `@guebbit/vue-toolkit`'s built-in `pageTotal` counts the **local** item dictionary, which is incorrect for server-paginated data (e.g. a stale row from a previous language still inflating the count). This composable standardizes the fix so every server-paginated store handles it identically.

## Key elements

- **`useServerPageTotal()`** – the sole export. Returns:
  - `pageTotal: Ref<number>` – reactive value to bind in place of the toolkit's own `pageTotal`; initialized to `0`.
  - `captureTotal(totalPages: number)` – setter to invoke from `search:`'s response handler with the server's `meta.totalPages`.

## Relationships

No graph neighbors recorded. The file depends only on Vue's `ref`/`Ref` and is consumed by store implementations (noted in the module doc as `locales/store.ts` being the original motivator), but those importers are not tracked in the dependency graph.

## Notes

- The toolkit's own `useStructureSearchApi` comment explicitly defers total tracking to the caller ("read it out of your own `apiCall` response and keep it in your own state"); this composable *is* that state, extracted for reuse.
- The motivating bug: a French search reported a phantom second page because the local dictionary still held Spanish rows, so the toolkit's local-count `pageTotal` was wrong.
- `pageTotal` starts at `0` (not `undefined`), so UI consuming it should treat `0` as "no data fetched yet."
