<script lang="ts">
export default {
    name: 'ProductsListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Products list: search/filter form, facet chips, and the paginated result. Shoppers get the
 * storefront grid (cards: picture, price, availability, add to cart); staff get the table with its
 * row actions (edit, soft delete or restore, hard delete). Both sort on the server (`filters.sort`).
 * The catalogue is public, so the split is on what the viewer may DO, not on being signed in.
 */
import { computed, onMounted } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { PackagePlus, Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/modules/products/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { formatCurrency, formatDate } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import type { Product } from '@types';

import { useListSearch } from '@/ui/composables/use-list-search.ts';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import { useServerSort } from '@/ui/composables/use-server-sort.ts';
import { sortFieldsOf } from '@/infrastructure/utils/sort.ts';
import { ProductSortItem } from '@/types/enums.ts';
import TableLoadingBar from '@/ui/molecules/TableLoadingBar.vue';
import SortSelect from '@/ui/molecules/SortSelect.vue';
import ProductCard from '@/modules/products/components/ProductCard.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useDeletedFilterOptions } from '@/ui/composables/use-deleted-filter-options.ts';

/**
 * Localized dictionary helper.
 */
const { t } = useI18n();

/**
 * Toast helper for search and mutation failures.
 */
const { addMessage } = useNotificationsStore();

/**
 * Products store actions.
 */
const { watchSearchProducts, deleteProduct, hardDeleteProduct, restoreProduct, fetchFacets } =
    useProductsStore();

/**
 * Products store reactive state — filters, current page window and the facets list.
 */
const {
    filters,
    pageItemList,
    selectedProductId,
    pageCurrent,
    pageTotal,
    pageSize,
    loading,
    facets
} = storeToRefs(useProductsStore());

/**
 * Whether the signed-in visitor may see the admin-only actions (create, edit, delete).
 */
const session = useSessionStore();

/**
 * Whether the viewer manages the catalogue — decides table (staff) or grid (everyone else), and
 * whether the staff-only filters show. Any one write permission is enough: a role that can edit
 * but not delete is still staff.
 */
const isStaff = computed(
    () =>
        session.can('create', 'Product') ||
        session.can('update', 'Product') ||
        session.can('delete', 'Product')
);

/**
 * Row-action button size: `small` on desktop, Vuetify's bigger default below `sm`, where a tap
 * replaces a click and `small` misses the WCAG touch-target recommendation.
 */
const rowActionSize = useTouchFriendlySize();

/**
 * Options of the admin-only "Deleted" filter.
 */
const deletedOptions = useDeletedFilterOptions();

/**
 * Options of the admin-only "Active" filter (FE_PARITY_0924 P4) — the public storefront's own
 * search always forces `active: true` server-side, so this only ever matters for an admin. The
 * "all" row's value is `null`, not `undefined` (FA51) — Vuetify reads an `undefined` item value
 * as "use the title", which would post the translated label instead of no filter at all.
 *
 * @returns The localized options, re-translated on locale change.
 */
const activeOptions = computed(() => [
    { value: null, label: t('products-list-page.filter-active-all') },
    { value: true, label: t('products-list-page.filter-active-yes') },
    { value: false, label: t('products-list-page.filter-active-no') }
]);

/**
 * The "Active" select's model: `null` (the "all" row) on screen, no `active` filter in
 * {@link filters}.
 */
const activeChoice = useAnyFilterChoice(
    () => filters.value.active,
    (value) => {
        filters.value.active = value;
    }
);

/**
 * The "Deleted" select's model: `null` (the "any" row) on screen, no `deleted` filter in
 * {@link filters}.
 */
const deletedChoice = useAnyFilterChoice(
    () => filters.value.deleted,
    (value) => {
        filters.value.deleted = value;
    }
);

/**
 * Columns of the products table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<Product>[]>(() => [
    /*
     * `synthetic` although `imageUrl` IS a field: the cell renders the picture, not the string,
     * and a sortable column of URLs is a control that offers an ordering nobody wants.
     */
    { title: t('products-list-page.column-image'), key: 'image', synthetic: true, width: '72px' },
    { title: t('products-list-page.column-id'), key: 'id' },
    { title: t('products-list-page.column-title'), key: 'title' },
    { title: t('products-list-page.column-price'), key: 'price' },
    { title: t('products-list-page.column-active'), key: 'active' },
    { title: t('products-list-page.column-created-at'), key: 'createdAt' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('products-list-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * Keeps the filters and page in the URL: a deep link renders filtered, and a reload keeps the view.
 */
const { sync: syncUrl } = useListUrlState({
    filters,
    page: pageCurrent,
    pageSize: pageSize,
    params: {
        text: 'string',
        id: 'string',
        minPrice: 'number',
        maxPrice: 'number',
        category: 'string',
        tag: 'string',
        active: 'boolean',
        deleted: 'boolean',
        sort: 'string'
    }
});

/**
 * Search trigger bound to the store's current filters.
 */
const { search } = watchSearchProducts({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Apply and clear, both restarting from the first page and keeping the URL in step.
 */
const { handleSearch, handleReset } = useListSearch({
    filters,
    page: pageCurrent,
    search,
    onApplied: syncUrl
});

/**
 * The columns the API can order by (the contract's `ProductSort` enum) — the staff table's other
 * headers stay inert rather than reorder one page.
 */
const sortableKeys = sortFieldsOf(ProductSortItem);

/**
 * The sort state, kept in `filters.sort` so it travels in the URL and the request: the staff
 * table edits it through {@link sortBy}, the shopper's select through {@link sortChoice}.
 */
const { sortBy, choice: sortChoice } = useServerSort({ filters, apply: handleSearch });

/**
 * The orders the shopper's select offers on top of the default newest-first — a subset of the
 * contract's `ProductSort` enum.
 *
 * @returns The options, re-translated on locale change.
 */
const sortOptions = computed(() => [
    { value: 'price', title: t('products-list-page.sort-price-asc') },
    { value: '-price', title: t('products-list-page.sort-price-desc') },
    { value: 'title', title: t('products-list-page.sort-title-asc') },
    { value: '-title', title: t('products-list-page.sort-title-desc') }
]);

/**
 * Toggles one category chip: selecting it filters the list, selecting it again clears it.
 * Chips restart from the first page like any other filter change.
 *
 * @param name - The facet value the chip carries.
 * @returns The search promise.
 */
const handleCategoryChip = (name: string) => {
    filters.value.category = filters.value.category === name ? undefined : name;
    return handleSearch();
};

/**
 * The tag twin of {@link handleCategoryChip}.
 *
 * @param name - The facet value the chip carries.
 * @returns The search promise.
 */
const handleTagChip = (name: string) => {
    filters.value.tag = filters.value.tag === name ? undefined : name;
    return handleSearch();
};

onMounted(fetchFacets);

/**
 * The row actions' own blocked state — delete and hard-delete share one instance, since both
 * are write actions behind a confirm dialog rather than a form with its own field to block: the
 * table keeps working either way, so one alert above it is where a failure belongs. A search
 * failure is a different kind of thing (ambient, the table just hasn't refreshed) and keeps
 * toasting through {@link notifyErrorMessages} above — see docs/theory/request-flow.md.
 */
const {
    message: rowActionError,
    report: reportRowActionError,
    clear: clearRowActionError
} = useBlockingError();

/**
 * Deletes a product after an explicit confirmation.
 *
 * @param productId - Identifier of the product to delete.
 * @param title - The row's own display name, named in the confirmation.
 * @returns A promise settling once the viewer has answered and, if they accepted, the
 *  delete has finished; a failure blocks the list in place ({@link rowActionError}).
 */
const handleDelete = (productId: string, title: string) =>
    useDialogStore()
        .confirm({
            message: t('products-list-page.confirm-delete', { name: title }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return deleteProduct(productId)
                .then(() => addMessage(t('products-list-page.success-delete')))
                .catch((error: unknown) => reportRowActionError(error));
        });

/**
 * Undoes a soft delete. No confirmation: nothing is lost by it, and a mistaken restore is one
 * delete away. The list is reloaded afterwards, since the active filter may no longer match.
 *
 * @param productId - Identifier of the product to restore.
 * @returns A promise settling once the restore and the reload have finished; a failure blocks the
 *  list in place ({@link rowActionError}).
 */
const handleRestore = (productId: string) => {
    clearRowActionError();
    return restoreProduct(productId)
        .then(() => addMessage(t('products-list-page.success-restore')))
        .then(() => search(true))
        .catch((error: unknown) => reportRowActionError(error));
};

/**
 * Permanently deletes a product after an explicit confirmation. Unlike {@link handleDelete}, this
 * bypasses the soft-delete and cannot be undone.
 *
 * @param productId - Identifier of the product to hard-delete.
 * @param title - The row's own display name, named in the confirmation.
 * @returns A promise settling once the viewer has answered and, if they accepted, the
 *  hard-delete has finished; a failure blocks the list in place ({@link rowActionError}).
 */
const handleHardDelete = (productId: string, title: string) =>
    useDialogStore()
        .confirm({
            message: t('products-list-page.confirm-hard-delete', { name: title }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return hardDeleteProduct(productId)
                .then(() => addMessage(t('products-list-page.success-hard-delete')))
                .catch((error: unknown) => reportRowActionError(error));
        });
</script>

<template>
    <div id="products-list-page">
        <div
            v-if="facets && (facets.categories.length > 0 || facets.tags.length > 0)"
            class="mb-4"
            data-test="facet-chips"
        >
            <div v-if="facets.categories.length > 0" class="flex flex-wrap items-center gap-2">
                <span class="text-sm opacity-70">{{
                    t('products-list-page.label-categories')
                }}</span>
                <!--
                    A chip with `@click` is already a keyboard stop in Vuetify (tabindex, Enter and
                    Space); what it lacks is a role and a stated state, so the selected chip is
                    announced as pressed rather than only coloured.
                -->
                <v-chip
                    v-for="facet in facets.categories"
                    :key="'category-' + facet.name"
                    size="small"
                    role="button"
                    data-test="category-chip"
                    :aria-pressed="filters.category === facet.name ? 'true' : 'false'"
                    :color="filters.category === facet.name ? 'primary' : undefined"
                    @click="handleCategoryChip(facet.name)"
                >
                    {{ facet.name }} ({{ facet.count }})
                </v-chip>
            </div>
            <div v-if="facets.tags.length > 0" class="mt-2 flex flex-wrap items-center gap-2">
                <span class="text-sm opacity-70">{{ t('products-list-page.label-tags') }}</span>
                <v-chip
                    v-for="facet in facets.tags"
                    :key="'tag-' + facet.name"
                    size="small"
                    role="button"
                    data-test="tag-chip"
                    :aria-pressed="filters.tag === facet.name ? 'true' : 'false'"
                    :color="filters.tag === facet.name ? 'primary' : undefined"
                    @click="handleTagChip(facet.name)"
                >
                    {{ facet.name }} ({{ facet.count }})
                </v-chip>
            </div>
        </div>

        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <v-text-field
                        v-model="filters.text"
                        :label="t('products-list-page.filter-text')"
                        data-test="filter-text"
                        maxlength="200"
                        hide-details
                    />
                    <v-text-field
                        v-if="isStaff"
                        v-model="filters.id"
                        :label="t('products-list-page.filter-id')"
                        hide-details
                    />
                    <v-number-input
                        v-model="filters.minPrice"
                        data-test="filter-min-price"
                        :label="t('products-list-page.filter-min-price')"
                        :min="0"
                        control-variant="hidden"
                        hide-details
                    />
                    <v-number-input
                        v-model="filters.maxPrice"
                        data-test="filter-max-price"
                        :label="t('products-list-page.filter-max-price')"
                        :min="0"
                        control-variant="hidden"
                        hide-details
                    />
                    <v-select
                        v-if="session.can('delete', 'Product')"
                        v-model="activeChoice"
                        :label="t('products-list-page.filter-active')"
                        :items="activeOptions"
                        item-title="label"
                        item-value="value"
                        data-test="filter-active"
                        hide-details
                    />
                    <v-select
                        v-if="session.can('delete', 'Product')"
                        v-model="deletedChoice"
                        :label="t('generic.filter-deleted')"
                        :items="deletedOptions"
                        item-title="label"
                        item-value="value"
                        data-test="filter-deleted"
                        hide-details
                    />
                    <SortSelect
                        v-if="!isStaff"
                        v-model="sortChoice"
                        :label="t('products-list-page.sort-label')"
                        :default-label="t('products-list-page.sort-newest')"
                        :options="sortOptions"
                    />
                    <PageSizeSelect v-model="pageSize" :label="t('generic.page-size')" />
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <v-btn type="submit" color="primary">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="handleReset">{{ t('generic.reset') }}</v-btn>
                    <v-spacer />
                    <v-btn
                        v-if="session.can('create', 'Product')"
                        color="secondary"
                        data-test="create-product"
                        :to="routerLinkI18n({ name: 'ProductCreate' })"
                    >
                        <PackagePlus :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('products-list-page.button-create-product') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <InlineErrorAlert
            :message="rowActionError"
            class="mb-4"
            data-test="products-list-row-action-error"
        />

        <template v-if="!isStaff">
            <v-empty-state
                v-if="!loading && pageItemList.length === 0"
                :title="t('products-list-page.empty-products')"
                data-test="products-empty"
            />
            <section
                v-else
                :aria-label="t('products-list-page.grid-caption')"
                :aria-busy="loading ? 'true' : undefined"
                class="relative"
                data-test="products-grid"
            >
                <TableLoadingBar v-if="loading" />
                <ul class="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <li v-for="product in pageItemList" :key="product.id">
                        <ProductCard :product="product" />
                    </li>
                </ul>
            </section>
        </template>

        <DataTable
            v-else
            v-model="selectedProductId"
            v-model:sort-by="sortBy"
            :server-sort-keys="sortableKeys"
            :headers="tableHeaders"
            :items="pageItemList"
            :caption="t('products-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.image`]="{ item }">
                <LazyImage
                    :src="item.imageUrl"
                    :thumbnail-src="item.thumbnailUrl"
                    :alt="t('products-list-page.image-alt', { name: item.title })"
                    :width="56"
                    :height="56"
                />
            </template>

            <template v-slot:[`item.price`]="{ item }">
                {{ formatCurrency(item.price, item.currency) }}
            </template>

            <template v-slot:[`item.active`]="{ item }">
                <v-chip size="small" variant="tonal" :color="item.active ? 'success' : 'error'">
                    {{ item.active ? t('generic.enabled') : t('generic.disabled') }}
                </v-chip>
                <v-chip
                    v-if="item.deletedAt"
                    size="small"
                    variant="tonal"
                    color="warning"
                    class="ml-1"
                    data-test="row-deleted"
                >
                    {{ t('generic.deleted') }}
                </v-chip>
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        data-test="row-view"
                        :aria-label="
                            t('products-list-page.button-view-named', { name: item.title })
                        "
                        :to="routerLinkI18n({ name: 'ProductTarget', params: { id: item.id } })"
                    >
                        {{ t('products-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('update', 'Product')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :aria-label="
                            t('products-list-page.button-edit-named', { name: item.title })
                        "
                        :to="routerLinkI18n({ name: 'ProductEdit', params: { id: item.id } })"
                    >
                        {{ t('products-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('delete', 'Product') && item.deletedAt"
                        :size="rowActionSize"
                        variant="tonal"
                        color="success"
                        data-test="row-restore"
                        :aria-label="
                            t('products-list-page.button-restore-named', { name: item.title })
                        "
                        :disabled="loading"
                        @click.stop="handleRestore(item.id)"
                    >
                        {{ t('products-list-page.button-restore') }}
                    </v-btn>
                    <v-btn
                        v-else-if="session.can('delete', 'Product')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-delete"
                        :aria-label="
                            t('products-list-page.button-delete-named', { name: item.title })
                        "
                        :disabled="loading"
                        @click.stop="handleDelete(item.id, item.title)"
                    >
                        {{ t('products-list-page.button-delete') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('delete', 'Product')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-hard-delete"
                        :aria-label="
                            t('products-list-page.button-hard-delete-named', { name: item.title })
                        "
                        :disabled="loading"
                        @click.stop="handleHardDelete(item.id, item.title)"
                    >
                        {{ t('products-list-page.button-hard-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </div>
</template>
