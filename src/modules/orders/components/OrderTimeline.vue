<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'OrderTimeline'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The order page's history: one line per thing that happened, oldest first. The server decides
 * which rows the caller may read — staff get every one with the actor and any text they wrote, the
 * buyer only the buyer-visible ones and never an actor — so this component filters nothing. Staff
 * (`display:Order`) additionally get a badge on the rows the buyer cannot see. The text of each
 * line is `describeTimelineEntry`'s, built from the row's ids and codes.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { EyeOff } from 'lucide-vue-next';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatUtcDate
} from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { describeTimelineEntry, isStaffOnly } from '../domain';
import type { TimelineTools } from '../domain';
import { useOrdersStore } from '../store.ts';
import type { OrderTimelineEntry } from '@types';

/**
 * The order whose history this is, and a value that changes whenever the order moves (the owning
 * page already re-reads the order on every move; the timeline follows it).
 */
const props = defineProps<{
    orderId: string;
    /** Any value that differs after the order changed; the history is read again when it does. */
    refreshKey?: string;
}>();

/**
 * The i18n instance: `te` tells a known code from a new one.
 */
const i18n = useI18n();

/**
 * Translate, for the template.
 */
const { t } = i18n;

/**
 * Signed-in caller: the staff view is whoever may read other people's orders.
 */
const session = useSessionStore();

/**
 * The rows, oldest first, as the server filtered them for this caller.
 */
const entries = ref<OrderTimelineEntry[]>([]);

/**
 * Whether the first read is still in flight.
 */
const loading = ref(true);

/**
 * The read's own blocked state: a failure shows in place of the list, not as a toast.
 */
const { message: readError, report: reportReadError, clear: clearReadError } = useBlockingError();

/**
 * The helpers `describeTimelineEntry` needs, bound to this app's i18n and formatters.
 */
const tools: TimelineTools = {
    t: (key, params) => t(key, params ?? {}),
    has: (key) => i18n.te(key),
    money: (amount, currency) => formatCurrency(amount, currency),
    date: (iso) => formatDate(iso),
    utcDate: (iso) => formatUtcDate(iso)
};

/**
 * Each row with its line, rebuilt when the rows or the language change.
 */
const lines = computed(() =>
    entries.value.map((entry) => ({ entry, line: describeTimelineEntry(entry, tools) }))
);

/**
 * Ticket of the newest read; an older read finishing late sees it moved on and drops its answer.
 */
let latestRead = 0;

/**
 * Reads the history.
 *
 * @returns A promise resolving once the rows (or the failure) are on screen.
 */
const load = () => {
    const read = ++latestRead;
    clearReadError();
    return useOrdersStore()
        .fetchTimeline(props.orderId)
        .then((rows) => {
            if (read === latestRead) entries.value = rows;
        })
        .catch((error: unknown) => {
            if (read === latestRead) reportReadError(error);
        })
        .finally(() => {
            if (read === latestRead) loading.value = false;
        });
};

/**
 * Reads on mount and whenever the order, or the order's state, changes.
 */
watch(() => [props.orderId, props.refreshKey], load, { immediate: true });
</script>

<template>
    <section
        class="flex flex-col gap-3"
        data-test="order-timeline"
        :aria-labelledby="`${orderId}-timeline-title`"
    >
        <h2 :id="`${orderId}-timeline-title`" class="m-0 text-lg">
            {{ t('order-timeline.title') }}
        </h2>
        <InlineErrorAlert :message="readError" data-test="order-timeline-error" />
        <p v-if="loading" class="m-0 opacity-75" data-test="order-timeline-loading">
            {{ t('order-timeline.loading') }}
        </p>
        <p
            v-else-if="lines.length === 0 && !readError"
            class="m-0 opacity-75"
            data-test="order-timeline-empty"
        >
            {{ t('order-timeline.empty') }}
        </p>
        <ol v-else class="m-0 flex list-none flex-col gap-3 p-0">
            <li
                v-for="{ entry, line } in lines"
                :key="entry.id"
                class="flex flex-col gap-1 border-l-2 pl-3"
                data-test="order-timeline-entry"
                :data-type="entry.type"
            >
                <div class="flex flex-wrap items-center gap-2">
                    <strong data-test="order-timeline-title">{{ line.title }}</strong>
                    <v-chip
                        v-if="session.can('display', 'Order') && isStaffOnly(entry.type)"
                        size="x-small"
                        variant="tonal"
                        color="warning"
                        data-test="order-timeline-staff-only"
                    >
                        <EyeOff :size="12" class="mr-1" aria-hidden="true" />
                        {{ t('order-timeline.badge-staff-only') }}
                    </v-chip>
                </div>
                <span v-if="line.detail" class="text-sm" data-test="order-timeline-detail">
                    {{ line.detail }}
                </span>
                <span v-if="entry.text" class="text-sm italic" data-test="order-timeline-text">
                    {{ t('order-timeline.label-text', { text: entry.text }) }}
                </span>
                <span class="text-xs opacity-75">
                    <time :datetime="entry.at" data-test="order-timeline-at">{{
                        formatDateTime(entry.at)
                    }}</time>
                    <template v-if="entry.actor">
                        ·
                        <span data-test="order-timeline-actor">{{
                            t('order-timeline.label-actor', { actor: entry.actor })
                        }}</span>
                    </template>
                </span>
            </li>
        </ol>
    </section>
</template>
