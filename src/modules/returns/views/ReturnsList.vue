<script lang="ts">
export default {
    name: 'ReturnsListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The returns list: the store's paginated search wired to a filter form and a pager, like every
 * other list. A customer sees the returns on their own orders and staff see every one — the server
 * decides, so this page is the same for both.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search, Undo2 } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useReturnsStore } from '@/modules/returns/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useListSearch } from '@/ui/composables/use-list-search.ts';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import { ReturnStatus, ReturnReason } from '@/types/enums.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher.
 */
const { addMessage } = useNotificationsStore();

/**
 * The search this page drives.
 */
const { watchSearchReturns } = useReturnsStore();

/**
 * List reactive state — filters, the current page window and the pagination counters.
 */
const { filters, pageItemList, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useReturnsStore());

/**
 * The status filter's choices, with a leading "any status" entry whose value is `null`, not
 * `undefined` (FA51) — Vuetify reads an `undefined` item value as "use the title".
 */
const statusOptions = computed(() => [
    { value: null, title: t('returns-list-page.filter-status-any') },
    ...Object.values(ReturnStatus).map((status) => ({
        value: status,
        title: t(`returns-form.status-${status}`)
    }))
]);

/**
 * The reason filter's choices, shaped like {@link statusOptions}.
 */
const reasonOptions = computed(() => [
    { value: null, title: t('returns-list-page.filter-reason-any') },
    ...Object.values(ReturnReason).map((reason) => ({
        value: reason,
        title: t(`returns-form.reason-${reason}`)
    }))
]);

/**
 * The status select's model: `null` on screen, no `status` filter in the store.
 */
const statusChoice = useAnyFilterChoice(
    () => filters.value.status,
    (value) => {
        filters.value.status = value;
    }
);

/**
 * The reason select's model, same shape.
 */
const reasonChoice = useAnyFilterChoice(
    () => filters.value.reason,
    (value) => {
        filters.value.reason = value;
    }
);

/**
 * Whether any filter is narrowing the list — picks the empty state's wording.
 */
const isFiltered = computed(() => Object.values(filters.value).some(Boolean));

/**
 * Keeps the filters and page in the URL: a deep link renders filtered, and a reload keeps the view.
 */
const { sync: syncUrl } = useListUrlState({
    filters,
    page: pageCurrent,
    pageSize: pageSize,
    params: { status: Object.values(ReturnStatus), reason: Object.values(ReturnReason) }
});

/**
 * Search bound to the store's reactive filters and pagination; a failed request is a toast.
 */
const { search } = watchSearchReturns({
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
</script>

<template>
    <div id="returns-list-page">
        <v-card class="mx-auto mb-6 w-full max-w-3xl p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-3">
                    <v-select
                        v-model="statusChoice"
                        data-test="filter-status"
                        :label="t('returns-list-page.filter-status')"
                        :items="statusOptions"
                        item-title="title"
                        item-value="value"
                        hide-details
                    />
                    <v-select
                        v-model="reasonChoice"
                        data-test="filter-reason"
                        :label="t('returns-list-page.filter-reason')"
                        :items="reasonOptions"
                        item-title="title"
                        item-value="value"
                        hide-details
                    />
                    <PageSizeSelect v-model="pageSize" :label="t('generic.page-size')" />
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <v-btn
                        type="submit"
                        color="primary"
                        :loading="loading"
                        data-test="search-submit"
                    >
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn
                        variant="tonal"
                        :disabled="loading"
                        data-test="search-reset"
                        @click="handleReset"
                    >
                        {{ t('generic.reset') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <v-empty-state
            v-if="pageItemList.length === 0"
            :title="isFiltered ? t('returns-list-page.empty-search') : t('returns-list-page.empty')"
        >
            <template #media>
                <Undo2 :size="64" class="text-secondary" aria-hidden="true" />
            </template>
        </v-empty-state>

        <div v-else class="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <v-card
                v-for="item in pageItemList"
                :key="'return-' + item.id"
                class="p-5"
                data-test="return-item"
            >
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 class="text-lg font-semibold">
                            {{ t(`returns-form.reason-${item.reason}`) }}
                        </h2>
                        <p class="text-sm opacity-70">
                            {{ item.orderNumber ?? item.orderId }} ·
                            {{ formatDateTime(item.createdAt) }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <v-chip variant="tonal" color="tertiary">
                            {{ t(`returns-form.status-${item.status}`) }}
                        </v-chip>
                        <v-btn
                            size="small"
                            variant="tonal"
                            data-test="return-open"
                            :to="routerLinkI18n({ name: 'ReturnTarget', params: { id: item.id } })"
                        >
                            {{ t('returns-list-page.button-open') }}
                        </v-btn>
                    </div>
                </div>
            </v-card>

            <ListPagination v-model="pageCurrent" :length="pageTotal" />
        </div>
    </div>
</template>
