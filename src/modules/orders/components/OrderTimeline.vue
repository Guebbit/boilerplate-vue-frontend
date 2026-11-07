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
 * line is `describeTimelineEntry`'s, built from the row's ids and codes. A row done by the order's
 * own buyer carries an "own order" chip for staff, so a review sees a staff member handling their own
 * order's money at a glance. Holders of `update:Order` also get a box to leave a staff note, which
 * the server keeps staff-only and encrypted; the history reads again once it is saved. The same
 * holders can remove the text of a note that still has some: the row stays, without it.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { EyeOff } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import {
    formatCurrency,
    formatDay,
    formatDateTime,
    formatUtcDate
} from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { describeTimelineEntry } from '../domain';
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
    /** The order's buyer: a row whose actor is this account was done by the order's own buyer. */
    ownerId?: string;
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
 * The rows, oldest first, as the server filtered them for this caller. Absent until the first read
 * lands.
 */
const entries = ref<OrderTimelineEntry[]>();

/**
 * The read's own blocked state: a failure shows in place of the list, not as a toast.
 */
const { message: readError, report: reportReadError, clear: clearReadError } = useBlockingError();

/**
 * Whether the first read is still in flight: nothing has arrived and nothing has failed. Derived,
 * not a flag — a refresh keeps the rows on screen and never brings the notice back.
 */
const loading = computed(() => entries.value === undefined && readError.value === undefined);

/**
 * The helpers `describeTimelineEntry` needs, bound to this app's i18n and formatters.
 */
const tools: TimelineTools = {
    t: (key, params) => t(key, params ?? {}),
    has: (key) => i18n.te(key),
    money: (amount, currency) => formatCurrency(amount, currency),
    day: (iso) => formatDay(iso),
    utcDate: (iso) => formatUtcDate(iso)
};

/**
 * Toast dispatcher, used to confirm a saved note.
 */
const { addMessage } = useNotificationsStore();

/**
 * The note being typed.
 */
const noteText = ref('');

/**
 * Whether the note is on its way to the server.
 */
const savingNote = ref(false);

/**
 * The note box's own blocked state: a refusal (too long, rate limit) shows beside the box.
 */
const { message: noteError, report: reportNoteError, clear: clearNoteError } = useBlockingError();

/**
 * The blocked state of a note's text removal, shown beside the row it failed on.
 */
const {
    message: removeError,
    report: reportRemoveError,
    clear: clearRemoveError
} = useBlockingError();

/**
 * The row whose text removal is on its way, or the one {@link removeError} belongs to.
 */
const removingNoteId = ref<string>();

/**
 * Each row with its line, rebuilt when the rows or the language change. `text` is read here
 * because only a variant that carries it has the key (`in` narrows the union to it).
 */
const lines = computed(() =>
    (entries.value ?? []).map((entry) => ({
        entry,
        line: describeTimelineEntry(entry, tools),
        text: 'text' in entry ? entry.text : undefined
    }))
);

/**
 * Whether a row was done by the order's own buyer — a staff member handling their own order's
 * money is allowed and recorded, and this is where a reader sees it. The actor reaches the screen
 * only for staff, and the row outlives the 90-day audit row.
 *
 * @param entry - the row
 * @returns `true` when the row's actor is the order's buyer
 */
const isByBuyer = (entry: OrderTimelineEntry): boolean =>
    props.ownerId !== undefined && entry.actor === props.ownerId;

/**
 * Task of the newest read; an older read finishing late sees it moved on and drops its answer.
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
        });
};

/**
 * Saves the typed note, then reads the history again so the new row appears.
 *
 * @returns A promise settling once the call finished; a refusal stays beside the box.
 */
const saveNote = () => {
    const text = noteText.value.trim();
    if (!text) return Promise.resolve();
    clearNoteError();
    savingNote.value = true;
    return useOrdersStore()
        .addNote(props.orderId, text)
        .then(() => {
            noteText.value = '';
            addMessage(t('order-timeline.note-saved'));
            return load();
        })
        .catch((error: unknown) => reportNoteError(error))
        .finally(() => {
            savingNote.value = false;
        });
};

/**
 * Withdraws the text of one note, then reads the history again so the row shows without it.
 *
 * @param eventId - the `note_added` row
 * @returns A promise settling once the call finished; a refusal stays beside the row.
 */
const removeNoteText = (eventId: string) => {
    clearRemoveError();
    removingNoteId.value = eventId;
    return useOrdersStore()
        .deleteNote(props.orderId, eventId)
        .then(() => {
            removingNoteId.value = undefined;
            addMessage(t('order-timeline.note-removed'));
            return load();
        })
        .catch((error: unknown) => reportRemoveError(error));
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
        <form
            v-if="session.can('update', 'Order')"
            class="flex flex-col gap-2"
            novalidate
            data-test="order-timeline-note-form"
            @submit.prevent="saveNote"
        >
            <v-textarea
                v-model="noteText"
                :label="t('order-timeline.note-label')"
                :hint="t('order-timeline.note-hint')"
                persistent-hint
                rows="2"
                maxlength="2000"
                counter
                density="compact"
                data-test="order-timeline-note-text"
            />
            <InlineErrorAlert :message="noteError" data-test="order-timeline-note-error" />
            <div class="flex justify-end">
                <v-btn
                    type="submit"
                    variant="tonal"
                    :loading="savingNote"
                    :disabled="savingNote || !noteText.trim()"
                    data-test="order-timeline-note-submit"
                >
                    {{ t('order-timeline.note-submit') }}
                </v-btn>
            </div>
        </form>
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
                v-for="{ entry, line, text } in lines"
                :key="entry.id"
                class="flex flex-col gap-1 border-l-2 pl-3"
                data-test="order-timeline-entry"
                :data-type="entry.type"
            >
                <div class="flex flex-wrap items-center gap-2">
                    <strong data-test="order-timeline-title">{{ line.title }}</strong>
                    <v-chip
                        v-if="session.can('display', 'Order') && entry.audience === 'staff'"
                        size="x-small"
                        variant="tonal"
                        color="warning"
                        data-test="order-timeline-staff-only"
                    >
                        <EyeOff :size="12" class="mr-1" aria-hidden="true" />
                        {{ t('order-timeline.badge-staff-only') }}
                    </v-chip>
                    <v-chip
                        v-if="session.can('display', 'Order') && isByBuyer(entry)"
                        size="x-small"
                        variant="tonal"
                        color="info"
                        data-test="order-timeline-own-order"
                    >
                        {{ t('order-timeline.badge-own-order') }}
                    </v-chip>
                </div>
                <span v-if="line.detail" class="text-sm" data-test="order-timeline-detail">
                    {{ line.detail }}
                </span>
                <span v-if="text" class="text-sm italic" data-test="order-timeline-text">
                    {{ t('order-timeline.label-text', { text }) }}
                </span>
                <div
                    v-if="entry.type === 'note_added' && text && session.can('update', 'Order')"
                    class="flex flex-col gap-1"
                >
                    <div>
                        <v-btn
                            size="x-small"
                            variant="text"
                            :loading="removingNoteId === entry.id && !removeError"
                            :disabled="removingNoteId === entry.id && !removeError"
                            data-test="order-timeline-note-remove"
                            @click="removeNoteText(entry.id)"
                        >
                            {{ t('order-timeline.note-remove') }}
                        </v-btn>
                    </div>
                    <InlineErrorAlert
                        v-if="removingNoteId === entry.id"
                        :message="removeError"
                        data-test="order-timeline-note-remove-error"
                    />
                </div>
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
