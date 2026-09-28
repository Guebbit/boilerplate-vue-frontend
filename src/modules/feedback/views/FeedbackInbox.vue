<script lang="ts">
export default {
    name: 'FeedbackInboxPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Admin inbox: the store's paginated search wired to a filter form and a pager, like every other
 * admin list, with a per-row status select and delete.
 */
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Inbox, Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useFeedbackStore } from '@/modules/feedback/store.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import { FeedbackRequestStatus } from '@/types/enums.ts';
import type { FeedbackRequest, FeedbackRequestStatus as TFeedbackRequestStatus } from '@types';

/**
 * The admin inbox for the public contact form: every ticket, movable through its statuses.
 */
const { t } = useI18n();

/**
 * Toast dispatcher.
 */
const { addMessage } = useNotificationsStore();

/**
 * The admin actions this page drives.
 */
const { watchSearchRequests, updateRequest, deleteRequest } = useFeedbackStore();

/**
 * Inbox reactive state — filters, the current page window and the pagination counters.
 */
const { filters, pageItemList, pageCurrent, pageSize, pageTotal, loading } =
    storeToRefs(useFeedbackStore());

/**
 * The status choices, labelled in the visitor's language.
 *
 * @returns One select item per contract status.
 */
const statusOptions = computed(() =>
    Object.values(FeedbackRequestStatus).map((status) => ({
        value: status,
        title: t(`feedback-inbox-page.status-${status}`)
    }))
);

/**
 * The search form's own status choices — {@link statusOptions} plus a leading "any status" entry,
 * since not filtering is a real choice here that a per-row status select never offers. The "any"
 * row's value is `null`, not `undefined` (FA51) — Vuetify reads an `undefined` item value as "use
 * the title", which would post the translated label instead of no filter at all.
 *
 * @returns The filter's select items, re-translated on locale change.
 */
const filterStatusOptions = computed(() => [
    { value: null, title: t('feedback-inbox-page.filter-status-any') },
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
 * Whether any filter is narrowing the inbox — picks the empty state's wording.
 */
const isFiltered = computed(() => Object.values(filters.value).some(Boolean));

/**
 * Search function bound to the store's reactive `filters`/pagination, reporting a failed request
 * as a toast.
 */
const { search } = watchSearchRequests({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Applies the current filters, restarting from the first page.
 *
 * @returns The search promise, resolving once the page is loaded.
 */
const handleSearch = () => {
    pageCurrent.value = 1;
    return search();
};

/**
 * Clears every filter and reloads the first page from the API.
 *
 * @returns The search promise, resolving once the page is loaded.
 */
const handleReset = () => {
    filters.value = {};
    pageCurrent.value = 1;
    return search(true);
};

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
 * Moves one ticket to a new status. The page is reloaded afterwards, since an active status
 * filter may no longer match the row.
 *
 * @param requestId - Which ticket.
 * @param status - Its next status.
 * @returns A promise settling once the write and the reload have finished; a failure blocks the
 *  list in place ({@link rowActionError}).
 */
const handleStatus = (requestId: string, status: TFeedbackRequestStatus) => {
    clearRowActionError();
    return updateRequest(requestId, { status })
        .then(() => addMessage(t('feedback-inbox-page.success-status')))
        .then(() => search(true))
        .catch((error: unknown) => reportRowActionError(error));
};

/**
 * Unsaved internal-notes edits, keyed by ticket id — separate from the record itself so typing
 * in one card's textarea never fights the row's own `adminNotes` while a save is in flight.
 */
const noteDrafts = reactive<Record<string, string | undefined>>({});

/**
 * What a ticket's notes textarea should show: the visitor's own unsaved edit if there is one,
 * otherwise the record's last saved value.
 *
 * @param request - The ticket the textarea belongs to.
 * @returns The current draft, or `''` when neither a draft nor a saved note exists.
 */
const noteValueOf = (request: FeedbackRequest) =>
    noteDrafts[request.id] ?? request.adminNotes ?? '';

/**
 * Saves one ticket's internal notes through the same PATCH the status move uses — an empty
 * textarea sends `null` (the D17c convention: `''` on this nullable, `minLength: 1` field is a
 * 422, not a synonym for "no change").
 *
 * @param request - Which ticket, and its last saved notes (the fallback {@link noteValueOf} reads
 *  if this save was never actually edited).
 * @returns A promise settling once the write and the reload have finished; a failure blocks the
 *  list in place ({@link rowActionError}).
 */
const handleSaveNotes = (request: FeedbackRequest) => {
    clearRowActionError();
    const value = noteValueOf(request).trim();
    return updateRequest(request.id, { adminNotes: value === '' ? null : value })
        .then(() => addMessage(t('feedback-inbox-page.success-notes')))
        .then(() => search(true))
        .catch((error: unknown) => reportRowActionError(error));
};

/**
 * Permanently removes one ticket, after an explicit confirmation — the erasure path a GDPR
 * request goes through, once an operator has found the rows by search.
 *
 * @param requestId - Which ticket.
 * @param subject - Named in the confirmation, so declining or accepting is about a specific
 * ticket rather than "the one I last clicked".
 * @returns Nothing; a failure blocks the list in place ({@link rowActionError}).
 */
const handleDelete = (requestId: string, subject: string) => {
    return useDialogStore()
        .confirm({ message: t('feedback-inbox-page.confirm-delete', { subject }), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            clearRowActionError();
            return deleteRequest(requestId)
                .then(() => addMessage(t('feedback-inbox-page.success-delete')))
                .catch((error: unknown) => reportRowActionError(error));
        });
};
</script>

<template>
    <div id="feedback-inbox-page">
        <v-card class="mx-auto mb-6 w-full max-w-3xl p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                    <v-text-field
                        v-model="filters.text"
                        :label="t('feedback-inbox-page.filter-text')"
                        maxlength="200"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.email"
                        :label="t('feedback-inbox-page.filter-email')"
                        hide-details
                    />
                    <v-select
                        v-model="statusChoice"
                        :label="t('feedback-inbox-page.filter-status')"
                        :items="filterStatusOptions"
                        item-title="title"
                        item-value="value"
                        hide-details
                    />
                    <PageSizeSelect v-model="pageSize" :label="t('generic.page-size')" />
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <v-btn type="submit" color="primary" :loading="loading">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" :disabled="loading" @click="handleReset">
                        {{ t('generic.reset') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <v-empty-state
            v-if="pageItemList.length === 0"
            :title="
                isFiltered ? t('feedback-inbox-page.empty-search') : t('feedback-inbox-page.empty')
            "
        >
            <template #media>
                <Inbox :size="64" class="text-secondary" aria-hidden="true" />
            </template>
        </v-empty-state>

        <div v-else class="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <InlineErrorAlert :message="rowActionError" data-test="feedback-row-action-error" />

            <v-card
                v-for="request in pageItemList"
                :key="'feedback-' + request.id"
                data-test="feedback-item"
                class="p-5"
            >
                <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h2 class="text-lg font-semibold">{{ request.subject }}</h2>
                        <p class="text-sm opacity-70">
                            {{ request.name || t('feedback-inbox-page.anonymous') }} —
                            {{ request.email }} · {{ formatDateTime(request.createdAt) }}
                        </p>
                        <p
                            v-if="request.respondedAt"
                            class="text-sm opacity-70"
                            data-test="feedback-responded-at"
                        >
                            {{
                                t('feedback-inbox-page.label-responded-at', {
                                    date: formatDateTime(request.respondedAt)
                                })
                            }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <v-select
                            :model-value="request.status"
                            :items="statusOptions"
                            :loading="loading"
                            :aria-label="
                                t('feedback-inbox-page.status-label', { subject: request.subject })
                            "
                            density="compact"
                            hide-details
                            style="max-width: 180px"
                            data-test="feedback-status"
                            @update:model-value="
                                (status) =>
                                    handleStatus(request.id, status as TFeedbackRequestStatus)
                            "
                        />
                        <v-btn
                            size="small"
                            variant="tonal"
                            color="error"
                            data-test="feedback-delete"
                            :aria-label="
                                t('feedback-inbox-page.button-delete-named', {
                                    subject: request.subject
                                })
                            "
                            :disabled="loading"
                            @click="handleDelete(request.id, request.subject)"
                        >
                            {{ t('feedback-inbox-page.button-delete') }}
                        </v-btn>
                    </div>
                </div>
                <p class="mt-3 whitespace-pre-line">{{ request.message }}</p>

                <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <v-textarea
                        :model-value="noteValueOf(request)"
                        :label="t('feedback-inbox-page.label-notes')"
                        :aria-label="
                            t('feedback-inbox-page.label-notes-named', { subject: request.subject })
                        "
                        maxlength="5000"
                        rows="2"
                        auto-grow
                        density="compact"
                        hide-details
                        class="flex-1"
                        data-test="feedback-notes"
                        @update:model-value="(value) => (noteDrafts[request.id] = value)"
                    />
                    <v-btn
                        size="small"
                        variant="tonal"
                        :disabled="loading"
                        data-test="feedback-notes-save"
                        :aria-label="
                            t('feedback-inbox-page.button-save-notes-named', {
                                subject: request.subject
                            })
                        "
                        @click="handleSaveNotes(request)"
                    >
                        {{ t('feedback-inbox-page.button-save-notes') }}
                    </v-btn>
                </div>
            </v-card>

            <ListPagination v-model="pageCurrent" :length="pageTotal" />
        </div>
    </div>
</template>
