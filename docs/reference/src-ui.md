# UI Kit

`src/ui/` holds the components that know **no domain**. A component here can be dropped into any
module — or into a different project — because nothing in it names a product, an order or a user.

This directory has no counterpart in the paired backend. It is the one place where being a
frontend changes the shape of the repository rather than just the contents.

::: tip Where a component belongs
If it renders a domain's data, it belongs to that module (`src/modules/*/components/`). If it
renders a *shape* — a table, a paginator, a labelled field — it belongs here. The test is whether
removing a module would make the component meaningless.
:::

---

## Molecules

Small, single-purpose, and composed into the organisms below.

| File | What it is | Read next |
|---|---|---|
| `src/ui/molecules/DefinitionRow.vue` | One label/value row of a `<dl>` — the dense list shape, for a panel stating a dozen facts at once. | [UI Kit](./src-ui.md) |
| `src/ui/molecules/FormCounterInput.vue` | A numeric input with increment and decrement affordances — quantity fields everywhere. | [Component Testing](../tools/component-testing.md) |
| `src/ui/molecules/FormImageUpload.vue` | The image field: file picker, preview, and the client-side limits before a request is made. | [Infrastructure](./src-infrastructure.md) |
| `src/ui/molecules/ItemDetailField.vue` | One read-only label/value pair, the atom every detail page is built from. | [UI Kit](./src-ui.md) |
| `src/ui/molecules/ListPagination.vue` | The paginator: page count in, page changes out, no knowledge of what is being paged. | [State & Routing](../tools/state-and-routing.md) |
| `src/ui/molecules/TableLoadingBar.vue` | The loading bar a `v-data-table` renders through its `#loader` slot. | [UI Kit](./src-ui.md) |

## Organisms

| File | What it is | Read next |
|---|---|---|
| `src/ui/organisms/DataTable.vue` | The list surface every admin screen uses: columns declared as data, with sorting, loading and pagination wired in. | [Admin Dashboard](../tools/admin-dashboard.md) |
| `src/ui/organisms/ItemDetailLayout.vue` | The shared skeleton for entity detail and edit pages — product, order, user. What keeps twelve detail screens looking like one app. | [Admin Dashboard](../tools/admin-dashboard.md) |
| `src/ui/organisms/ItemDetailHero.vue` | The header band of that skeleton: title, subtitle, actions. | [UI Kit](./src-ui.md) |
| `src/ui/organisms/CardDetail.vue` | A card presenting one entity's fields. | [UI Kit](./src-ui.md) |
| `src/ui/organisms/CardInfo.vue` | A gradient tile keyed to the theme accent, for summary panels. | [UI Kit](./src-ui.md) |
| `src/ui/organisms/CardMaterialStat.vue` | A statistic tile with a coloured top border keyed to the theme accent — the dashboard's number cards. | [Admin Dashboard](../tools/admin-dashboard.md) |

## Vuetify

| File | What it is | Read next |
|---|---|---|
| `src/ui/vuetify/index.ts` | The Vuetify instance: the theme, its accent colours, and the defaults every component inherits. Changing the palette is one edit here. | [Runtime](../tools/runtime.md) |
| `src/ui/vuetify/icons.ts` | The icon set registration, kept apart so the icon library can be swapped without touching the theme. | [Package Dependencies](../tools/package-dependencies.md) |
