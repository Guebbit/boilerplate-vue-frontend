<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'TaskInboxPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Staff inbox: the store's paginated search wired to a filter form and a pager, like every other
 * admin list. Each row offers the status doors the server says the viewer may use (`actions`),
 * and links to the detail page where the thread and the assignment live.
 */
import ListEmptyState from '@/ui/molecules/ListEmptyState.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Inbox } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useTasksStore } from '../store.ts';
import { useRowActions } from '@/ui/composables/use-row-actions.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useOrderNumberLink } from '@/kernel/order-link.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useListSearch } from '@/ui/composables/use-list-search.ts';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import { useServerSort } from '@/ui/composables/use-server-sort.ts';
import SortSelect from '@/ui/molecules/SortSelect.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import ListSearchActions from '@/ui/molecules/ListSearchActions.vue';
import { TaskCategory, TaskKind, TaskSource, TaskStatus } from '@/types/enums.ts';
import type { Task } from '@types';

/**
 * The admin tasks page for the public contact form: every task, movable through its statuses.
 */
const { t } = useI18n();

/**
 * The session, for the viewer's own id: "take" assigns a task to them.
 */
const session = useSessionStore();

/**
 * A task's order number as a link to the staff orders list filtered to it, when the build ships one.
 */
const orderNumberLink = useOrderNumberLink();

/**
 * Toast dispatcher.
 */
const { addMessage } = useNotificationsStore();

/**
 * The admin actions this page drives.
 */
const { watchSearchRequests, deleteRequest, resolve, markSpam, reopen, assign } = useTasksStore();

/**
 * Inbox reactive state — filters, the current page window and the pagination counters.
 */
const { filters, pageItemList, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useTasksStore());

/**
 * The status choices, labelled in the visitor's language.
 *
 * @returns One select item per contract status.
 */
const statusOptions = computed(() =>
    Object.values(TaskStatus).map((status) => ({
        value: status,
        title: t(`tasks-page.status-${status}`)
    }))
);

/**
 * The search form's own status choices — {@link statusOptions} plus a leading "any status" entry,
 * since not filtering is a real choice here that a per-row status select never offers. The "any"
 * row's value is `null`, not `undefined` — Vuetify reads an `undefined` item value as "use
 * the title", which would post the translated label instead of no filter at all.
 *
 * @returns The filter's select items, re-translated on locale change.
 */
const filterStatusOptions = computed(() => [
    { value: null, title: t('tasks-page.filter-status-any') },
    ...statusOptions.value
]);

/**
 * The status select's model: `null` (the "any" row) on screen, no `status` filter in the store.
 */
const statusChoice = useAnyFilterChoice(
    () => filters.value.status,
    (value) => {
        filters.value.status = value;
    }
);

/**
 * The category filter's choices: a leading "any category" row (value `null`, for the same reason
 * as {@link filterStatusOptions}) and one row per category the contact form offers.
 */
const filterCategoryOptions = computed(() => [
    { value: null, title: t('tasks-page.filter-category-any') },
    ...Object.values(TaskCategory).map((category) => ({
        value: category,
        title: t(`task-category.${category}`)
    }))
]);

/**
 * The category select's model: `null` (the "any" row) on screen, no `category` filter in the store.
 */
const categoryChoice = useAnyFilterChoice(
    () => filters.value.category,
    (value) => {
        filters.value.category = value;
    }
);

/**
 * The assignee filter's choices: anyone, the viewer's own, or nobody yet.
 */
const filterAssigneeOptions = computed(() => [
    { value: null, title: t('tasks-page.filter-assignee-any') },
    { value: 'me', title: t('tasks-page.filter-assignee-me') },
    { value: 'none', title: t('tasks-page.filter-assignee-none') }
]);

/**
 * The assignee select's model: `null` (the "any" row) on screen, no `assignee` filter in the store.
 */
const assigneeChoice = useAnyFilterChoice(
    () => filters.value.assignee,
    (value) => {
        filters.value.assignee = value;
    }
);

/**
 * The source filter's choices: a contact message from a visitor, or a task the system opened.
 */
const filterSourceOptions = computed(() => [
    { value: null, title: t('tasks-page.filter-source-any') },
    ...Object.values(TaskSource).map((source) => ({
        value: source,
        title: t(`tasks-page.source-${source}`)
    }))
]);

/**
 * The source select's model.
 */
const sourceChoice = useAnyFilterChoice(
    () => filters.value.source,
    (value) => {
        filters.value.source = value;
    }
);

/**
 * The kind filter's choices: one row per situation a task can be about.
 */
const filterKindOptions = computed(() => [
    { value: null, title: t('tasks-page.filter-kind-any') },
    ...Object.values(TaskKind).map((kind) => ({
        value: kind,
        title: t(`task-kind.${kind}`)
    }))
]);

/**
 * The kind select's model.
 */
const kindChoice = useAnyFilterChoice(
    () => filters.value.kind,
    (value) => {
        filters.value.kind = value;
    }
);

/**
 * Whether any filter is narrowing the inbox — picks the empty state's wording.
 */
const isFiltered = computed(() =>
    Object.entries(filters.value).some(([name, value]) => name !== 'sort' && Boolean(value))
);

/**
 * Keeps the filters and page in the URL: a deep link renders filtered, and a reload keeps the view.
 */
const { sync: syncUrl } = useListUrlState({
    filters,
    page: pageCurrent,
    pageSize: pageSize,
    params: {
        text: 'string',
        email: 'string',
        status: Object.values(TaskStatus),
        category: Object.values(TaskCategory),
        source: Object.values(TaskSource),
        kind: Object.values(TaskKind),
        assignee: 'string',
        overdue: 'boolean',
        sort: 'string'
    }
});

/**
 * Search function bound to the store's reactive `filters`/pagination, reporting a failed request
 * as a toast.
 */
const { search } = watchSearchRequests({
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
 * The sort select's model, kept in `filters.sort`; picking an order re-searches from page 1.
 */
const { choice: sortChoice } = useServerSort({ filters, apply: handleSearch });

/**
 * The orders the inbox offers on top of the default newest-first — a subset of the contract's
 * `TaskSort` enum, the ones a triager reaches for.
 *
 * @returns The select's options, re-translated on locale change.
 */
const sortOptions = computed(() => [
    { value: 'createdAt', title: t('tasks-page.sort-oldest') },
    { value: 'dueAt', title: t('tasks-page.sort-due') },
    { value: 'status', title: t('tasks-page.sort-status') },
    { value: 'email', title: t('tasks-page.sort-email') }
]);

/**
 * The row actions' own blocked state — a status move and a delete share one instance, since
 * neither has a per-row slot for an alert and the list keeps working either way, the same
 * reasoning `ProductsList.vue`'s row actions use. A search/reset failure is a different kind of
 * thing (ambient, the list just hasn't refreshed) and keeps toasting through
 * {@link notifyErrorMessages} above.
 */
const {
    message: rowActionError,
    report: reportRowActionError,
    clear: clearRowActionError
} = useBlockingError();

/**
 * The row-write pipelines, straight and confirmed, failing into {@link rowActionError}.
 */
const { run, runConfirmed } = useRowActions({
    report: reportRowActionError,
    clear: clearRowActionError
});

/**
 * Runs one status door on a row, then reloads: an active filter may no longer match the row.
 *
 * @param move - The door: resolve, mark as spam or reopen.
 * @param requestId - Which task.
 * @returns A promise settling once the write and the reload have finished; a failure blocks the
 *  list in place ({@link rowActionError}).
 */
const handleDoor = (move: (id: string) => Promise<unknown>, requestId: string) =>
    run({
        action: () => move(requestId),
        success: t('tasks-page.success-status'),
        afterwards: () => search(true)
    });

/**
 * Takes a task: assigns it to the viewer, which also starts it.
 *
 * @param request - Which task.
 * @returns A promise settling once the write and the reload have finished.
 */
const handleTake = (request: Task) =>
    run({
        action: () => assign(request.id, session.viewer?.id ?? ''),
        success: t('tasks-page.success-take'),
        afterwards: () => search(true)
    });

/**
 * Permanently removes one task, after an explicit confirmation — the erasure path a GDPR
 * request goes through, once an operator has found the rows by search.
 *
 * @param requestId - Which task.
 * @param subject - Named in the confirmation, so declining or accepting is about a specific
 * task rather than "the one I last clicked".
 * @returns Nothing; a failure blocks the list in place ({@link rowActionError}).
 */
const handleDelete = (requestId: string, subject: string) =>
    runConfirmed({
        confirm: t('tasks-page.confirm-delete', { subject }),
        action: () => deleteRequest(requestId),
        success: t('tasks-page.success-delete')
    });
</script>

<template>
    <div id="tasks-page">
        <v-card class="mx-auto mb-6 w-full max-w-3xl p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                    <v-text-field
                        v-model="filters.text"
                        data-test="filter-text"
                        :label="t('tasks-page.filter-text')"
                        maxlength="200"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.email"
                        data-test="filter-email"
                        :label="t('tasks-page.filter-email')"
                        hide-details
                    />
                    <v-select
                        v-model="statusChoice"
                        data-test="filter-status"
                        :label="t('tasks-page.filter-status')"
                        :items="filterStatusOptions"
                        item-title="title"
                        item-value="value"
                        hide-details
                    />
                    <v-select
                        v-model="categoryChoice"
                        data-test="filter-category"
                        :label="t('tasks-page.filter-category')"
                        :items="filterCategoryOptions"
                        item-title="title"
                        item-value="value"
                        hide-details
                    />
                    <v-select
                        v-model="assigneeChoice"
                        data-test="filter-assignee"
                        :label="t('tasks-page.filter-assignee')"
                        :items="filterAssigneeOptions"
                        item-title="title"
                        item-value="value"
                        hide-details
                    />
                    <v-select
                        v-model="sourceChoice"
                        data-test="filter-source"
                        :label="t('tasks-page.filter-source')"
                        :items="filterSourceOptions"
                        item-title="title"
                        item-value="value"
                        hide-details
                    />
                    <v-select
                        v-model="kindChoice"
                        data-test="filter-kind"
                        :label="t('tasks-page.filter-kind')"
                        :items="filterKindOptions"
                        item-title="title"
                        item-value="value"
                        hide-details
                    />
                    <v-checkbox
                        v-model="filters.overdue"
                        data-test="filter-overdue"
                        :label="t('tasks-page.filter-overdue')"
                        hide-details
                    />
                    <SortSelect
                        v-model="sortChoice"
                        :label="t('tasks-page.sort-label')"
                        :default-label="t('tasks-page.sort-newest')"
                        :options="sortOptions"
                    />
                    <PageSizeSelect v-model="pageSize" />
                </div>
                <ListSearchActions :loading="loading" @reset="handleReset" />
            </form>
        </v-card>

        <ListEmptyState
            v-if="pageItemList.length === 0"
            :title="isFiltered ? t('tasks-page.empty-search') : t('tasks-page.empty')"
            :icon="Inbox"
        >
        </ListEmptyState>

        <div v-else class="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <InlineErrorAlert :message="rowActionError" data-test="task-row-action-error" />

            <v-card
                v-for="request in pageItemList"
                :key="'task-' + request.id"
                data-test="task-item"
                class="p-5"
            >
                <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h2 class="text-lg font-semibold">{{ request.subject }}</h2>
                        <p class="text-sm opacity-muted">
                            {{ request.name || t('tasks-page.anonymous') }} —
                            {{ request.email ?? t(`task-kind.${request.kind}`) }} ·
                            {{ formatDateTime(request.createdAt) }}
                        </p>
                        <p
                            v-if="request.category || request.orderNumber"
                            class="text-sm opacity-muted"
                            data-test="task-category"
                        >
                            <v-chip v-if="request.category" size="x-small" variant="tonal" label>
                                {{ t(`task-category.${request.category}`) }}
                            </v-chip>
                            <span v-if="request.orderNumber" class="ml-2">
                                <router-link
                                    v-if="orderNumberLink(request.orderNumber)"
                                    :to="orderNumberLink(request.orderNumber)!"
                                    data-test="task-order-link"
                                >
                                    {{
                                        t('tasks-page.label-order', {
                                            number: request.orderNumber
                                        })
                                    }}
                                </router-link>
                                <template v-else>
                                    {{
                                        t('tasks-page.label-order', {
                                            number: request.orderNumber
                                        })
                                    }}
                                </template>
                            </span>
                        </p>
                        <p
                            v-if="request.respondedAt"
                            class="text-sm opacity-muted"
                            data-test="task-responded-at"
                        >
                            {{
                                t('tasks-page.label-responded-at', {
                                    date: formatDateTime(request.respondedAt)
                                })
                            }}
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <v-chip size="small" variant="tonal" label data-test="task-status">
                            {{ t(`tasks-page.status-${request.status}`) }}
                        </v-chip>
                        <v-chip
                            v-if="request.dueAt"
                            size="small"
                            variant="tonal"
                            label
                            :color="request.overdue ? 'error' : undefined"
                            data-test="task-due"
                        >
                            {{
                                t(
                                    request.overdue
                                        ? 'tasks-page.label-overdue'
                                        : 'tasks-page.label-due',
                                    { date: formatDateTime(request.dueAt) }
                                )
                            }}
                        </v-chip>
                        <v-chip
                            v-if="request.assigneeName"
                            size="small"
                            variant="tonal"
                            label
                            data-test="task-assignee"
                        >
                            {{
                                t('tasks-page.label-assignee', {
                                    name: request.assigneeName
                                })
                            }}
                        </v-chip>
                    </div>
                </div>
                <p class="mt-3 whitespace-pre-line">{{ request.message }}</p>

                <div class="mt-3 flex flex-wrap gap-2">
                    <v-btn
                        v-if="request.actions.assign && !request.assigneeId"
                        size="small"
                        variant="tonal"
                        :disabled="loading"
                        data-test="task-take"
                        @click="handleTake(request)"
                    >
                        {{ t('tasks-page.button-take') }}
                    </v-btn>
                    <v-btn
                        v-if="request.actions.resolve"
                        size="small"
                        variant="tonal"
                        :disabled="loading"
                        data-test="task-resolve"
                        :aria-label="
                            t('tasks-page.button-resolve-named', {
                                subject: request.subject
                            })
                        "
                        @click="handleDoor(resolve, request.id)"
                    >
                        {{ t('tasks-page.button-resolve') }}
                    </v-btn>
                    <v-btn
                        v-if="request.actions.markSpam"
                        size="small"
                        variant="tonal"
                        :disabled="loading"
                        data-test="task-spam"
                        :aria-label="
                            t('tasks-page.button-spam-named', { subject: request.subject })
                        "
                        @click="handleDoor(markSpam, request.id)"
                    >
                        {{ t('tasks-page.button-spam') }}
                    </v-btn>
                    <v-btn
                        v-if="request.actions.reopen"
                        size="small"
                        variant="tonal"
                        :disabled="loading"
                        data-test="task-reopen"
                        :aria-label="
                            t('tasks-page.button-reopen-named', { subject: request.subject })
                        "
                        @click="handleDoor(reopen, request.id)"
                    >
                        {{ t('tasks-page.button-reopen') }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="text"
                        :disabled="loading"
                        data-test="task-open"
                        :to="{ name: 'TaskDetail', params: { id: request.id } }"
                    >
                        {{ t('tasks-page.button-open') }}
                    </v-btn>
                    <v-btn
                        v-if="request.actions.delete"
                        size="small"
                        variant="tonal"
                        color="error"
                        data-test="task-delete"
                        :aria-label="
                            t('tasks-page.button-delete-named', { subject: request.subject })
                        "
                        :disabled="loading"
                        @click="handleDelete(request.id, request.subject)"
                    >
                        {{ t('tasks-page.button-delete') }}
                    </v-btn>
                </div>
            </v-card>

            <ListPagination v-model="pageCurrent" :length="pageTotal" />
        </div>
    </div>
</template>
