<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'DisputeBanner'
};
</script>

<script setup lang="ts">
/**
 * @module
 * What the buyer's bank did to a payment: one alert per dispute, with its kind, where it stands,
 * the reason, the amount, the day evidence is due and a link to the provider's dashboard, where the
 * shop answers. The shop's own page sends no evidence. Staff only: the server sends `disputes` to a
 * caller holding `display:Payment` and to nobody else, so this renders whatever it is given.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatCurrency, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import type { Dispute } from '@types';

/**
 * The disputes of one payment.
 */
const { disputes } = defineProps<{
    /** The payment's `disputes`, oldest first; none renders nothing. */
    disputes: readonly Dispute[];
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * One day, in milliseconds.
 */
const DAY_MS = 86_400_000;

/**
 * The evidence deadline as a sentence: the days left, or how late. The server sends the date; the
 * count is the page's, because it changes every day while the row does not.
 *
 * @param dueBy - The dispute's `evidenceDueBy`.
 * @returns The sentence and whether it is overdue.
 */
const deadlineOf = (dueBy: string) => {
    const days = Math.ceil((new Date(dueBy).getTime() - Date.now()) / DAY_MS);
    return days >= 0
        ? { overdue: false, text: t('dispute-banner.due-left', { count: days }, days) }
        : { overdue: true, text: t('dispute-banner.due-over', { count: -days }, -days) };
};

/**
 * Whether the dispute still waits on someone: the shop's evidence or the bank's decision.
 *
 * @param dispute - One dispute.
 * @returns `true` while it is open.
 */
const isOpen = (dispute: Dispute) =>
    dispute.status === 'needs_response' || dispute.status === 'under_review';

/**
 * The dashboard link, only when it is a plain `https` address: it comes from the provider's
 * delivery, and a `javascript:` link must never reach an anchor.
 *
 * @param dispute - One dispute.
 * @returns The address, or `undefined`.
 */
const dashboardOf = (dispute: Dispute) =>
    dispute.dashboardUrl?.startsWith('https://') ? dispute.dashboardUrl : undefined;

/**
 * The disputes with the derived bits each alert shows, computed once per change.
 */
const rows = computed(() =>
    disputes.map((dispute) => ({
        dispute,
        open: isOpen(dispute),
        // The bank's money grab is what pauses refunds; a question from the bank does not.
        pausesRefunds: dispute.kind === 'chargeback' && isOpen(dispute),
        deadline:
            dispute.evidenceDueBy && dispute.status === 'needs_response'
                ? deadlineOf(dispute.evidenceDueBy)
                : undefined,
        dashboard: dashboardOf(dispute)
    }))
);
</script>

<template>
    <div v-if="rows.length > 0" class="mb-4 space-y-3" data-test="dispute-banner">
        <v-alert
            v-for="row in rows"
            :key="row.dispute.disputeRef"
            :type="row.open ? 'warning' : 'info'"
            variant="tonal"
            density="compact"
            :data-test="`dispute-${row.dispute.disputeRef}`"
        >
            <p class="font-semibold" data-test="dispute-title">
                {{ t(`dispute-banner.title-${row.dispute.kind}`) }}
            </p>
            <p data-test="dispute-status">
                {{ t(`dispute-banner.status-${row.dispute.status}`) }}
            </p>
            <p class="text-sm">
                {{
                    t('dispute-banner.label-amount', {
                        amount: formatCurrency(row.dispute.amount, row.dispute.currency)
                    })
                }}
            </p>
            <p class="text-sm">
                {{
                    t('dispute-banner.label-reason', {
                        reason: t(`dispute-banner.reason-${row.dispute.reason}`)
                    })
                }}
            </p>
            <p
                v-if="row.deadline && row.dispute.evidenceDueBy"
                class="text-sm"
                data-test="dispute-due"
            >
                {{
                    t('dispute-banner.label-due', {
                        date: formatDateTime(row.dispute.evidenceDueBy)
                    })
                }}
                ·
                <strong :class="row.deadline.overdue ? 'text-error' : undefined">
                    {{ row.deadline.text }}
                </strong>
            </p>
            <p v-if="row.pausesRefunds" class="mt-1 text-sm" data-test="dispute-refunds-paused">
                {{ t('dispute-banner.refunds-paused') }}
            </p>
            <a
                v-if="row.dashboard"
                :href="row.dashboard"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 inline-block underline"
                data-test="dispute-dashboard"
            >
                {{ t('dispute-banner.open-dashboard') }}
            </a>
        </v-alert>
    </div>
</template>
