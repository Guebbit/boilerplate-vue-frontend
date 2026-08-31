<script lang="ts">
export default {
    name: 'FeedbackInboxPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Admin inbox: fetches the whole ticket list on mount and moves a ticket
 * through its statuses via a per-row select, reloading the list afterwards.
 */
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Inbox } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useFeedbackStore } from '@/modules/feedback/store.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { FeedbackRequestStatus } from '@types';
import type { FeedbackRequestStatus as TFeedbackRequestStatus } from '@types';

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
const { fetchRequests, updateStatus, deleteRequest } = useFeedbackStore();

/**
 * The inbox list and its shared loading flag.
 */
const { requests, loading } = storeToRefs(useFeedbackStore());

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
 * Moves one ticket to a new status.
 *
 * @param requestId - Which ticket.
 * @param status - Its next status.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleStatus = (requestId: string, status: TFeedbackRequestStatus) => {
    updateStatus(requestId, status)
        .then(() => addMessage(t('feedback-inbox-page.success-status')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Permanently removes one ticket, after an explicit confirmation — the erasure path a GDPR
 * request goes through, once an operator has found the rows by search.
 *
 * @param requestId - Which ticket.
 * @param subject - Named in the confirmation, so declining or accepting is about a specific
 * ticket rather than "the one I last clicked".
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleDelete = (requestId: string, subject: string) => {
    return useDialogStore()
        .confirm({ message: t('feedback-inbox-page.confirm-delete', { subject }), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return deleteRequest(requestId)
                .then(() => addMessage(t('feedback-inbox-page.success-delete')))
                .catch((error) => notifyErrorMessages(addMessage, error));
        });
};

onMounted(fetchRequests);
</script>

<template>
    <LayoutDefault id="feedback-inbox-page" :title="t('feedback-inbox-page.page-title')">
        <v-empty-state v-if="requests.length === 0" :title="t('feedback-inbox-page.empty')">
            <template #media>
                <Inbox :size="64" class="text-secondary" aria-hidden="true" />
            </template>
        </v-empty-state>

        <div v-else class="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <v-card
                v-for="request in requests"
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
            </v-card>
        </div>
    </LayoutDefault>
</template>
