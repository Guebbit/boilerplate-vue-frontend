<script setup lang="ts" generic="T extends object">
/**
 * @module
 * A thin wrapper over `v-data-table`: translates this app's `CoreDataTableHeader<T>` shape into
 * Vuetify's headers, forwards `header.*`/`item.*` slots the caller actually provided, swaps in
 * the accessible `TableLoadingBar`, and adds two OPT-IN behaviours through a `v-model`, each
 * detected from whether its own `update:*` listener is actually bound rather than from the
 * model's value: single-row selection (`v-model`) and client-side sorting (`v-model:sort-by`,
 * FA75) — pagination here is server-side for every real caller today, so a header is sortable
 * only for the one caller that opts in, and the footer stays hidden either way.
 */
import { computed, getCurrentInstance, useSlots } from 'vue';
import TableLoadingBar from '@/ui/molecules/TableLoadingBar.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';

/**
 * Component props — see each field's own doc comment below.
 */
const {
    headers,
    items,
    caption,
    itemValue = 'id',
    loading,
    loadingText,
    noDataText,
    rowTest = 'list-row'
} = defineProps<{
    headers: CoreDataTableHeader<T>[];
    items: T[];
    /**
     * What the table IS, for a reader who cannot see the heading above it: "Products",
     * "Stock movements". It names the region around the table, which is how a screen reader lists
     * it — a page with two tables (`inventory`) would otherwise announce two nameless tables.
     */
    caption: string;
    itemValue?: string;
    loading?: boolean;
    /**
     * Overrides Vuetify's own localised "Loading items..." — most callers pass this app's own
     * `generic.loading` key instead (FA75); left unset, Vuetify's bundled locale answers rather
     * than a component-level English default that would out-rank it.
     */
    loadingText?: string;
    /**
     * Overrides Vuetify's own localised "No data available" — same reasoning as
     * {@link loadingText}.
     */
    noDataText?: string;
    /**
     * `data-test` put on every row. Defaults to `list-row`, which is what a page with one table
     * should keep — the specs read it the same way everywhere.
     *
     * It exists for the page that shows TWO tables at once: `inventory` puts a stock board above
     * its movement ledger, and a spec asserting on rows has to be able to say which table it
     * means.
     */
    rowTest?: string;
}>();

/**
 * Selected row's `itemValue`, or `undefined` when the table is unbound / nothing is selected.
 */
const modelValue = defineModel<unknown>();

/**
 * Vuetify's own sort state (`{ key, order }[]`), bound only by a caller that wants CLIENT-side
 * sorting on this table — a short, unpaginated list, not the paginated fetches every other view
 * makes. `v-data-table`'s own shape, passed straight through via `v-model:sort-by` below.
 */
const sortBy = defineModel<{ key: string; order?: boolean | 'asc' | 'desc' }[]>('sortBy');

/**
 * This component's slots, read to compute {@link customHeaders}.
 */
const slots = useSlots();

/**
 * This component's own vnode props, read to detect whether a `v-model` listener was bound
 * (see {@link isSelectable}).
 */
const vnodeProps = getCurrentInstance()?.vnode.props;

/**
 * Whether the caller wants row selection at all.
 *
 * A table without a `v-model` is a table nobody asked to select from — an audit log, a read-only
 * ledger — and it should not highlight a row or swallow a click. `defineModel` alone cannot tell
 * a bound model from an unbound local ref, so the listener the parent passes is the evidence.
 *
 * Read off the vnode rather than `useAttrs()`: `defineModel` declares the `update:modelValue`
 * emit, and a listener for a declared emit is exactly what Vue keeps OUT of `$attrs` — so the
 * attrs check was always false, and no row was ever selectable.
 */
const isSelectable = computed(
    () => vnodeProps !== null && vnodeProps !== undefined && 'onUpdate:modelValue' in vnodeProps
);

/**
 * Whether the caller wants CLIENT-side sorting at all, same detection trick as
 * {@link isSelectable}: a `v-model:sort-by` listener is evidence a caller actually bound
 * {@link sortBy}, which an unbound `defineModel` alone cannot tell apart from a local ref.
 *
 * Pagination here is server-side for every real caller today (stores own `pageSize`/
 * `pageCurrent`), so a header sortable with nothing bound would only reorder the one PAGE this
 * table holds, not the catalogue behind it (FA75) — hence the default of `false` below.
 */
const isSortable = computed(
    () => vnodeProps !== null && vnodeProps !== undefined && 'onUpdate:sortBy' in vnodeProps
);

/**
 * The columns whose head the view renders itself.
 */
const customHeaders = computed(() => headers.filter((header) => `header.${header.key}` in slots));

/**
 * Headers in the shape `v-data-table` expects.
 *
 * A `synthetic` column reads no field, so there is nothing to sort it by regardless of
 * {@link isSortable}: Vuetify would still render its `<th>` focusable with a sort icon, a control
 * that does nothing — so it is told not to.
 *
 * @returns The column definitions, stripped of any extra property.
 */
const vuetifyHeaders = computed(() =>
    headers.map((header) => ({
        title: header.title,
        key: header.key,
        width: header.width,
        sortable: isSortable.value && !('synthetic' in header)
    }))
);

/**
 * Reads an arbitrary key off a row, since `T` is only known to be an object.
 *
 * @param item - Row to read from.
 * @param key - Property name to read.
 * @returns The raw property value, or `undefined` when absent.
 */
const getValue = (item: T, key: string): unknown => (item as Record<string, unknown>)[key];

/**
 * Selects one row through `v-model`.
 *
 * @param item - The row to select.
 */
const select = (item: T) => {
    if (!isSelectable.value) return;
    modelValue.value = getValue(item, itemValue);
};

/**
 * Per-row attributes, marking the selected row for styling and tests.
 *
 * A selectable row is also a keyboard stop: `@click:row` is mouse-only, so the row is made
 * focusable and Enter/Space select it the way a click does. A key pressed INSIDE a row's control
 * (the action buttons, an inline field) is that control's, not the row's.
 *
 * @param row - Slot argument holding the row under `item`.
 * @returns The attributes to spread on the `<tr>`: a highlight class when the
 *  row matches the model value, plus a `data-test` hook.
 */
const rowProps = ({ item }: { item: T }) => {
    const selected = isSelectable.value && modelValue.value === getValue(item, itemValue);
    return {
        class: selected ? 'bg-surface-variant' : undefined,
        'data-test': rowTest,
        tabindex: isSelectable.value ? 0 : undefined,
        'aria-selected': isSelectable.value ? selected : undefined,
        onKeydown: isSelectable.value
            ? (event: KeyboardEvent) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  select(item);
              }
            : undefined
    };
};

/**
 * Selects the clicked row through `v-model`.
 *
 * @param _event - Originating DOM event, unused.
 * @param row - Slot argument holding the clicked row under `item`.
 */
const handleRowClick = (_event: Event, { item }: { item: T }) => select(item);
</script>

<template>
    <!--
        The region is what carries the name and the busy flag: Vuetify's `<table>` is two wrappers
        down and takes neither, and `aria-busy` on the element a reader is inside is what stops it
        reading half a page of stale rows while the next page loads.
    -->
    <div role="region" :aria-label="caption" :aria-busy="loading ? 'true' : undefined">
        <!--
            Vuetify's `mobile` prop defaults to `false`, not `null`, so VDataTable never falls
            back to the app-wide display.mobile on its own — `mobile-breakpoint` is what switches
            it to its built-in stacked card-per-row layout below 600px ('sm').
        -->
        <v-data-table
            v-model:sort-by="sortBy"
            :headers="vuetifyHeaders"
            :items="items"
            :item-value="itemValue"
            :loading="loading"
            :loading-text="loadingText"
            :no-data-text="noDataText"
            items-per-page="-1"
            hide-default-footer
            class="rounded-xl border"
            :row-props="rowProps"
            mobile-breakpoint="sm"
            @click:row="handleRowClick"
        >
            <!-- Replaces Vuetify's unnamed internal bar — see `TableLoadingBar` for why. -->
            <template #loader>
                <TableLoadingBar />
            </template>

            <!--
                Forward a `header.*` slot ONLY when the view provides one, so a view can put more
                than a title in a column head (a per-column count, a hint). Forwarding all of them
                would replace Vuetify's default header — sort icon included — on every table in
                the app.
            -->
            <template
                v-for="header in customHeaders"
                #[`header.${header.key}`]
                :key="'header-' + header.key"
            >
                <slot :name="`header.${header.key}`" :column="header" />
            </template>

            <!-- forward every `item.*` slot to keep the existing view API -->
            <template
                v-for="header in headers"
                #[`item.${header.key}`]="slotProps"
                :key="'slot-' + header.key"
            >
                <slot
                    :name="`item.${header.key}`"
                    :item="slotProps.item"
                    :value="getValue(slotProps.item, header.key)"
                    :column="header"
                >
                    {{ getValue(slotProps.item, header.key) ?? '-' }}
                </slot>
            </template>
        </v-data-table>
    </div>
</template>
