<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ApiKeysListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Machine-to-machine credentials list. No filter form — `ListApiKeysParams` takes only
 * `page`/`pageSize`, so there is nothing to filter on — just a `DataTable`, pagination, and a
 * revoke action per row. Revoked rows stay in the list rather than dropping out of view; "Active"
 * / "Revoked" / "Expired" is derived client-side from `revokedAt`/`expiresAt`.
 */
import { computed } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Plus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useApiKeysStore } from '../store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDate, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import type { ApiKey } from '@types';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';

import type { ThemeColor } from '@/ui/types.ts';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useRowActions } from '@/ui/composables/use-row-actions.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The session, for the create button: it has no row, so no `actions` to follow. Revoke follows
 * each row's own `actions.revoke`.
 */
const session = useSessionStore();

/**
 * Api-keys store actions.
 */
const { watchApiKeysSearch, revokeCredential } = useApiKeysStore();

/**
 * Api-keys store reactive state — the current page window and the pagination counters. `filters`
 * is always empty (nothing to filter on) and only feeds the URL helper below.
 */
const { filters, pageItemList, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useApiKeysStore());

/**
 * Keeps the page and page size in the URL: a reload or a shared link lands on the same page. Runs
 * before the search below so the first read already uses what the link names.
 */
useListUrlState({ filters, page: pageCurrent, pageSize, params: {} });

/**
 * Row-action button size: `small` on desktop, Vuetify's bigger default below `sm`, where a tap
 * replaces a click and `small` misses the WCAG touch-target recommendation.
 */
const rowActionSize = useTouchFriendlySize();

/**
 * Columns of the credentials table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<ApiKey>[]>(() => [
    { title: t('api-keys-list-page.column-name'), key: 'name' },
    { title: t('api-keys-list-page.column-public-prefix'), key: 'publicPrefix' },
    { title: t('api-keys-list-page.column-permissions'), key: 'permissions' },
    { title: t('api-keys-list-page.column-status'), key: 'status', synthetic: true },
    { title: t('api-keys-list-page.column-last-used-at'), key: 'lastUsedAt' },
    { title: t('api-keys-list-page.column-created-at'), key: 'createdAt' },
    { title: t('api-keys-list-page.column-expires-at'), key: 'expiresAt' },
    { title: t('api-keys-list-page.column-revoked-at'), key: 'revokedAt' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('api-keys-list-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * Search function bound to the store's reactive pagination, reporting a failed request as a
 * toast.
 */
watchApiKeysSearch({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * The status chip's colour, one per `ApiKey.status` the server can answer. The server decides the
 * status (a banned minter suspends their keys); this only chooses how it looks.
 */
const statusColor = {
    active: 'success',
    expired: 'warning',
    revoked: 'error',
    suspended: 'warning'
} as const satisfies Record<ApiKey['status'], ThemeColor>;

/**
 * The row action's own blocked state — revoke is the table's only write action, behind a confirm
 * dialog that has already closed by the time the request answers, so its own row button has
 * nowhere to host an alert; one lives above the table instead. A search failure is a different
 * kind of thing (ambient, the table just hasn't refreshed) and keeps toasting through
 * {@link notifyErrorMessages} above — see docs/theory/request-flow.md.
 */
const {
    message: rowActionError,
    report: reportRowActionError,
    clear: clearRowActionError
} = useBlockingError();

/**
 * The confirm → write → toast pipeline, failing into {@link rowActionError}.
 */
const { runConfirmed } = useRowActions({
    report: reportRowActionError,
    clear: clearRowActionError
});

/**
 * Revokes a credential after an explicit confirmation.
 *
 * @param apiKey - The credential to revoke.
 * @returns A promise settling once the viewer has answered and, if they accepted, the revoke has
 *  finished; a failure blocks the list in place ({@link rowActionError}).
 */
const handleRevoke = (apiKey: ApiKey) =>
    runConfirmed({
        confirm: t('api-keys-list-page.confirm-revoke', { name: apiKey.name }),
        action: () => revokeCredential(apiKey.id),
        success: t('api-keys-list-page.success-revoke')
    });
</script>

<template>
    <div id="api-keys-list-page">
        <div class="mb-6 flex flex-wrap items-center gap-2">
            <PageSizeSelect v-model="pageSize" class="max-w-40" />
            <v-spacer />
            <v-btn
                v-if="session.can('create', 'ApiKey')"
                color="secondary"
                :to="routerLinkI18n({ name: 'ApiKeyCreate' })"
            >
                <Plus :size="16" class="mr-1" aria-hidden="true" />
                {{ t('api-keys-list-page.button-create') }}
            </v-btn>
        </div>

        <InlineErrorAlert
            :message="rowActionError"
            class="mb-4"
            data-test="api-keys-list-row-action-error"
        />

        <DataTable
            :headers="tableHeaders"
            :items="pageItemList"
            :caption="t('api-keys-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            :no-data-text="t('generic.no-data')"
        >
            <template v-slot:[`item.name`]="{ item }">
                <span :class="{ 'opacity-muted': item.status === 'revoked' }">{{ item.name }}</span>
            </template>

            <template v-slot:[`item.publicPrefix`]="{ item }">
                <span class="font-mono" :class="{ 'opacity-muted': item.status === 'revoked' }">
                    {{ item.publicPrefix }}
                </span>
            </template>

            <template v-slot:[`item.permissions`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-chip
                        v-for="permission in item.permissions"
                        :key="permission"
                        size="small"
                        variant="tonal"
                        :color="item.status === 'revoked' ? undefined : 'tertiary'"
                    >
                        {{ permission }}
                    </v-chip>
                </div>
            </template>

            <template v-slot:[`item.status`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="statusColor[item.status]"
                    data-test="api-key-status"
                    :data-status="item.status"
                >
                    {{ t(`api-keys-list-page.status-${item.status}`) }}
                </v-chip>
            </template>

            <template v-slot:[`item.lastUsedAt`]="{ item }">
                <span data-test="api-key-last-used" :data-used="item.lastUsedAt ? 'yes' : 'no'">
                    {{ item.lastUsedAt ? formatDate(item.lastUsedAt) : EMPTY_VALUE }}
                </span>
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.expiresAt`]="{ item }">
                {{ item.expiresAt ? formatDateTime(item.expiresAt) : EMPTY_VALUE }}
            </template>

            <template v-slot:[`item.revokedAt`]="{ item }">
                {{ item.revokedAt ? formatDateTime(item.revokedAt) : EMPTY_VALUE }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <v-btn
                    v-if="item.actions.revoke"
                    :size="rowActionSize"
                    variant="tonal"
                    color="error"
                    data-test="row-revoke"
                    :aria-label="t('api-keys-list-page.button-revoke-named', { name: item.name })"
                    :disabled="loading"
                    @click.stop="handleRevoke(item)"
                >
                    {{ t('api-keys-list-page.button-revoke') }}
                </v-btn>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </div>
</template>
