<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'TicketDetailPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * One ticket: who sent it or what it is about, its deadline, the assignment, the status doors the
 * server offers (`actions`), the staff thread with its composer, and the earlier tickets about the
 * same record. Every door answers the ticket as it now stands, so the page swaps it in and never
 * re-reads.
 */
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useTicketsStore } from '../store.ts';
import { useRowActions } from '@/ui/composables/use-row-actions.ts';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Translation accessor.
 */
const { t } = useI18n();

/**
 * The route, for the ticket id, and the router, for the sibling pages a link may reach.
 */
const route = useRoute();
const router = useRouter();

/**
 * The session: "take" assigns the ticket to the viewer.
 */
const session = useSessionStore();

/**
 * The store: the current ticket and the doors.
 */
const store = useTicketsStore();
const { ticket } = storeToRefs(store);

/**
 * What a 404 or a 403 on the read does: the shell's Error page.
 */
const onMissing = useMissingRecord();

/**
 * The id the route names.
 */
const ticketId = computed(() => String(route.params.id));

/**
 * Loads the ticket whenever the route's id changes.
 */
watch(
    ticketId,
    (id) => {
        store.loadTicket(id).catch(onMissing);
    },
    { immediate: true }
);

/**
 * The row-write pipeline, failing into the page's blocking alert.
 */
const { message: actionError, report, clear } = useBlockingError();
const { run } = useRowActions({ report, clear });

/**
 * The page a link to the ticket's record opens, when this build ships one.
 *
 * Only the record types that have a staff page are linked; the rest show as plain text.
 */
const recordLink = computed(() => {
    const link = ticket.value?.link;
    if (link?.type === 'order') return linkIfRouted(router, 'OrderTarget', { id: link.id });
    if (link?.type === 'user') return linkIfRouted(router, 'UserTarget', { id: link.id });
    return undefined;
});

/**
 * The draft of the next note.
 */
const draft = ref('');

/**
 * Runs one door and shows the toast; the store keeps the answer.
 *
 * @param move - Which door.
 * @param success - The already-translated toast.
 */
const handle = (move: () => Promise<unknown>, success: string) => run({ action: move, success });

/**
 * Appends the draft as a note, then empties the composer.
 */
const handleNote = () =>
    run({
        action: () =>
            store.addNote(ticketId.value, draft.value.trim()).then(() => (draft.value = '')),
        success: t('ticket-detail-page.success-note')
    });
</script>

<template>
    <div id="ticket-detail-page" class="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <InlineErrorAlert :message="actionError" data-test="ticket-action-error" />

        <v-card v-if="ticket" class="p-5" data-test="ticket-detail">
            <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h1 class="text-xl font-semibold">{{ ticket.subject }}</h1>
                    <p class="text-sm opacity-muted">
                        {{ t(`ticket-inbox-page.kind-${ticket.kind}`) }} ·
                        {{ formatDateTime(ticket.createdAt) }}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <v-chip size="small" variant="tonal" label data-test="ticket-status">
                        {{ t(`ticket-inbox-page.status-${ticket.status}`) }}
                    </v-chip>
                    <v-chip
                        v-if="ticket.dueAt"
                        size="small"
                        variant="tonal"
                        label
                        :color="ticket.overdue ? 'error' : undefined"
                        data-test="ticket-due"
                    >
                        {{
                            t(
                                ticket.overdue
                                    ? 'ticket-inbox-page.label-overdue'
                                    : 'ticket-inbox-page.label-due',
                                { date: formatDateTime(ticket.dueAt) }
                            )
                        }}
                    </v-chip>
                </div>
            </div>

            <div v-if="ticket.email" class="mt-3 text-sm" data-test="ticket-visitor">
                {{ ticket.name || t('ticket-inbox-page.anonymous') }} —
                <a :href="`mailto:${ticket.email}`">{{ ticket.email }}</a>
            </div>
            <p class="mt-3 whitespace-pre-line">{{ ticket.message }}</p>

            <p v-if="ticket.link" class="mt-3 text-sm" data-test="ticket-link">
                {{ t('ticket-detail-page.label-record') }}:
                <router-link v-if="recordLink" :to="recordLink">
                    {{ t(`ticket-detail-page.link-${ticket.link.type}`) }} {{ ticket.link.id }}
                </router-link>
                <template v-else>
                    {{ t(`ticket-detail-page.link-${ticket.link.type}`) }} {{ ticket.link.id }}
                </template>
            </p>

            <p v-if="ticket.assigneeName" class="mt-3 text-sm" data-test="ticket-assignee">
                {{ t('ticket-inbox-page.label-assignee', { name: ticket.assigneeName }) }}
            </p>

            <div class="mt-4 flex flex-wrap gap-2">
                <v-btn
                    v-if="ticket.actions.assign && ticket.assigneeId !== session.viewer?.id"
                    size="small"
                    variant="tonal"
                    data-test="ticket-take"
                    @click="
                        handle(
                            () => store.assign(ticket!.id, session.viewer?.id ?? ''),
                            t('ticket-inbox-page.success-take')
                        )
                    "
                >
                    {{ t('ticket-inbox-page.button-take') }}
                </v-btn>
                <v-btn
                    v-if="ticket.actions.unassign"
                    size="small"
                    variant="tonal"
                    data-test="ticket-give-back"
                    @click="
                        handle(
                            () => store.unassign(ticket!.id),
                            t('ticket-detail-page.success-give-back')
                        )
                    "
                >
                    {{ t('ticket-detail-page.button-give-back') }}
                </v-btn>
                <v-btn
                    v-if="ticket.actions.resolve"
                    size="small"
                    variant="tonal"
                    data-test="ticket-resolve"
                    @click="
                        handle(
                            () => store.resolve(ticket!.id),
                            t('ticket-inbox-page.success-status')
                        )
                    "
                >
                    {{ t('ticket-inbox-page.button-resolve') }}
                </v-btn>
                <v-btn
                    v-if="ticket.actions.markSpam"
                    size="small"
                    variant="tonal"
                    data-test="ticket-spam"
                    @click="
                        handle(
                            () => store.markSpam(ticket!.id),
                            t('ticket-inbox-page.success-status')
                        )
                    "
                >
                    {{ t('ticket-inbox-page.button-spam') }}
                </v-btn>
                <v-btn
                    v-if="ticket.actions.reopen"
                    size="small"
                    variant="tonal"
                    data-test="ticket-reopen"
                    @click="
                        handle(
                            () => store.reopen(ticket!.id),
                            t('ticket-inbox-page.success-status')
                        )
                    "
                >
                    {{ t('ticket-inbox-page.button-reopen') }}
                </v-btn>
            </div>
        </v-card>

        <v-card v-if="ticket" class="p-5" data-test="ticket-thread">
            <h2 class="text-lg font-semibold">{{ t('ticket-detail-page.heading-notes') }}</h2>
            <p class="text-sm opacity-muted">{{ t('ticket-detail-page.notes-hint') }}</p>
            <ul class="mt-3 flex flex-col gap-2">
                <li
                    v-for="(note, index) in ticket.notes"
                    :key="'note-' + index"
                    data-test="ticket-note"
                >
                    <span class="text-sm opacity-muted">{{ formatDateTime(note.at) }}</span>
                    <p class="whitespace-pre-line">{{ note.body }}</p>
                </li>
            </ul>
            <div
                v-if="ticket.actions.note"
                class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
            >
                <v-textarea
                    v-model="draft"
                    :label="t('ticket-detail-page.label-note')"
                    maxlength="5000"
                    rows="2"
                    auto-grow
                    density="compact"
                    hide-details
                    class="flex-1"
                    data-test="ticket-note-draft"
                />
                <v-btn
                    size="small"
                    variant="tonal"
                    :disabled="draft.trim().length === 0"
                    data-test="ticket-note-add"
                    @click="handleNote"
                >
                    {{ t('ticket-detail-page.button-add-note') }}
                </v-btn>
            </div>
        </v-card>

        <v-card v-if="ticket?.earlierTickets?.length" class="p-5" data-test="ticket-earlier">
            <h2 class="text-lg font-semibold">{{ t('ticket-detail-page.heading-earlier') }}</h2>
            <ul class="mt-2">
                <li v-for="earlier in ticket.earlierTickets" :key="earlier.id">
                    <router-link :to="{ name: 'TicketDetail', params: { id: earlier.id } }">
                        {{ t(`ticket-inbox-page.status-${earlier.status}`) }} ·
                        {{ formatDateTime(earlier.createdAt) }}
                    </router-link>
                </li>
            </ul>
        </v-card>
    </div>
</template>
