# docs/reference/src-ui.md

## Purpose

Reference page for the `src/ui/` directory — the domain-agnostic UI kit. It catalogs the reusable molecules, organisms, and Vuetify theme configuration that can be dropped into any module without importing product concepts.

## Key elements

**Molecules** (small, single-purpose building blocks):

- `DefinitionRow.vue` — one label/value row in a `<dl>` list.
- `FormCounterInput.vue` — numeric input with +/− buttons.
- `FormImageUpload.vue` — file picker, preview, and client-side validation before upload.
- `ItemDetailField.vue` — read-only label/value pair used across detail pages.
- `ListPagination.vue` — paginator component; emits page changes, knows nothing about the data.
- `TableLoadingBar.vue` — loading bar for `v-data-table`'s `#loader` slot.

**Organisms** (compositions of molecules):

- `DataTable.vue` — sortable, paginated list surface with data-driven columns.
- `ItemDetailLayout.vue` — shared skeleton for all entity detail/edit pages.
- `ItemDetailHero.vue` — header band (title, subtitle, actions) of the detail layout.
- `CardDetail.vue` — card presenting one entity's fields.
- `CardInfo.vue` — gradient summary tile keyed to the theme accent.
- `CardMaterialStat.vue` — stat tile with coloured top border for dashboard number cards.

**Vuetify theme:**

- `vuetify/index.ts` — Vuetify instance, theme, accent colours, and component defaults.
- `vuetify/icons.ts` — icon-set registration, isolated for easy swapping.

## Relationships

- **`docs/reference/src-modules.md`** — defines the boundary: components that render *domain* data live in `src/modules/*/components/`; components that render a generic *shape* live here. This page is the lookup for the latter.
- **`docs/reference/tests.md`** — testing conventions (e.g. component testing) apply to every molecule and organism listed here.
- **`src/ui/molecules/DefinitionRow.vue`, `FormCounterInput.vue`, `ListPagination.vue`** — individual molecule components documented on this page; each is a leaf that organisms compose.
- **`src/ui/organisms/DataTable.vue`, `ItemDetailLayout.vue`** — organism components that compose the molecules above; they are the two most widely reused screens in the admin area.
- **`src/ui/vuetify/index.ts`** — every component in this directory inherits its theme, accent colours, and defaults from this file; a palette change is a single edit here.

## Notes

- **Placement rule:** if removing a module would make a component meaningless, it belongs in that module's `components/` folder, not in `src/ui/`. The test is domain-coupling, not size.
- **No backend counterpart:** this directory is unique to the frontend repo; there is no paired backend directory.
- **Theme is centralized:** all accent-coloured components (`CardInfo`, `CardMaterialStat`, etc.) derive their colours from `vuetify/index.ts`. Do not hard-code hex values in components.
