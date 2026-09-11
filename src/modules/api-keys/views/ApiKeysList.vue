<script lang="ts">
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
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Plus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useApiKeysStore } from '@/modules/api-keys/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDate, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import type { ApiKey } from '@types';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useDialogStore } from '@/ui/dialog.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The session, for the `meta.can` rule that gates the revoke action — a reader who cannot revoke
 * should not see a button that 403s.
 */
const session = useSessionStore();

/**
 * Api-keys store actions.
 */
const { watchApiKeysSearch, revokeCredential } = useApiKeysStore();

/**
 * Api-keys store reactive state — the current page window and the pagination counters. No
 * filters ref: there is nothing to filter on.
 */
const { pageItemList, pageCurrent, pageSize, pageTotal, loading } = storeToRefs(useApiKeysStore());

/**
 * Row-action button size: `small` on desktop, Vuetify's bigger default below `sm`, where a tap
 * replaces a click and `small` misses the WCAG touch-target recommendation.
 */
const rowActionSize = useTouchFriendlySize();

/**
 * Selectable page sizes for the credentials table.
 */
const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' }
];

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
 * A credential's status, derived rather than stored: `revokedAt` set beats everything else, an
 * `expiresAt` already past comes next, anything else is active.
 *
 * @param apiKey - The row to derive a status for.
 */
const statusOf = (apiKey: ApiKey): 'revoked' | 'expired' | 'active' => {
    if (apiKey.revokedAt) return 'revoked';
    if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= Date.now()) return 'expired';
    return 'active';
};

/**
 * The status chip's colour, one per {@link statusOf} outcome.
 */
const statusColor = {
    active: 'success',
    expired: 'warning',
    revoked: 'error'
} as const;

/**
 * Revokes a credential after an explicit confirmation.
 *
 * @param apiKey - The credential to revoke.
 * @returns A promise settling once the viewer has answered and, if they accepted, the revoke has
 *  finished; the outcome is reported as a toast.
 */
const handleRevoke = (apiKey: ApiKey) =>
    useDialogStore()
        .confirm({ message: t('api-keys-list-page.confirm-revoke'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return revokeCredential(apiKey.id)
                .then(() => addMessage(t('api-keys-list-page.success-revoke')))
                .catch((error: unknown) => notifyErrorMessages(addMessage, error));
        });
</script>

<template>
    <LayoutDefault id="api-keys-list-page" :title="t('api-keys-list-page.page-title')">
        <div class="mb-6 flex flex-wrap items-center gap-2">
            <v-select
                v-model="pageSize"
                :label="t('generic.page-size')"
                :items="pageSizeOptions"
                item-title="label"
                item-value="value"
                hide-details
                style="max-width: 160px"
            />
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

        <DataTable
            :headers="tableHeaders"
            :items="pageItemList"
            :caption="t('api-keys-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            :no-data-text="t('generic.no-data')"
        >
            <template v-slot:[`item.name`]="{ item }">
                <span :class="{ 'opacity-60': statusOf(item) === 'revoked' }">{{ item.name }}</span>
            </template>

            <template v-slot:[`item.publicPrefix`]="{ item }">
                <span class="font-mono" :class="{ 'opacity-60': statusOf(item) === 'revoked' }">
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
                        color="tertiary"
                        :class="{ 'opacity-60': statusOf(item) === 'revoked' }"
                    >
                        {{ permission }}
                    </v-chip>
                </div>
            </template>

            <template v-slot:[`item.status`]="{ item }">
                <v-chip size="small" variant="tonal" :color="statusColor[statusOf(item)]">
                    {{ t(`api-keys-list-page.status-${statusOf(item)}`) }}
                </v-chip>
            </template>

            <template v-slot:[`item.lastUsedAt`]="{ item }">
                {{ item.lastUsedAt ? formatDate(item.lastUsedAt) : EMPTY_VALUE }}
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <v-btn
                    v-if="session.can('delete', 'ApiKey')"
                    :size="rowActionSize"
                    variant="tonal"
                    color="error"
                    data-test="row-revoke"
                    :aria-label="t('api-keys-list-page.button-revoke-named', { name: item.name })"
                    :disabled="loading || statusOf(item) === 'revoked'"
                    @click.stop="handleRevoke(item)"
                >
                    {{ t('api-keys-list-page.button-revoke') }}
                </v-btn>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
