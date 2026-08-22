<script lang="ts">
export default {
    name: 'FeedbackInboxPage'
};
</script>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Inbox } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useFeedbackStore } from '@/modules/feedback/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { FeedbackRequestStatus } from '@types';
import type { FeedbackRequestStatus as TFeedbackRequestStatus } from '@types';

/**
 * The admin inbox for the public contact form: every ticket, movable through its statuses.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { fetchRequests, updateStatus } = useFeedbackStore();
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
                            (status) => handleStatus(request.id, status as TFeedbackRequestStatus)
                        "
                    />
                </div>
                <p class="mt-3 whitespace-pre-line">{{ request.message }}</p>
            </v-card>
        </div>
    </LayoutDefault>
</template>
