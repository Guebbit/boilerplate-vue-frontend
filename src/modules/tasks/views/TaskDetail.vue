<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'TaskDetailPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * One task: who sent it or what it is about, its deadline, the assignment, the status doors the
 * server offers (`actions`), the staff thread with its composer, and the earlier tasks about the
 * same record. Every door answers the task as it now stands, so the page swaps it in and never
 * re-reads.
 */
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useTasksStore } from '../store.ts';
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
 * The route, for the task id, and the router, for the sibling pages a link may reach.
 */
const route = useRoute();
const router = useRouter();

/**
 * The session: "take" assigns the task to the viewer.
 */
const session = useSessionStore();

/**
 * The store: the current task and the doors.
 */
const store = useTasksStore();
const { task } = storeToRefs(store);

/**
 * What a 404 or a 403 on the read does: the shell's Error page.
 */
const onMissing = useMissingRecord();

/**
 * The id the route names.
 */
const taskId = computed(() => String(route.params.id));

/**
 * Loads the task whenever the route's id changes.
 */
watch(
    taskId,
    (id) => {
        store.loadTask(id).catch(onMissing);
    },
    { immediate: true }
);

/**
 * The row-write pipeline, failing into the page's blocking alert.
 */
const { message: actionError, report, clear } = useBlockingError();
const { run } = useRowActions({ report, clear });

/**
 * The page a link to the task's record opens, when this build ships one.
 *
 * Only the record types that have a staff page are linked; the rest show as plain text.
 */
const recordLink = computed(() => {
    const link = task.value?.link;
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
            store.addNote(taskId.value, draft.value.trim()).then(() => (draft.value = '')),
        success: t('task-detail-page.success-note')
    });
</script>

<template>
    <div id="task-detail-page" class="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <InlineErrorAlert :message="actionError" data-test="task-action-error" />

        <v-card v-if="task" class="p-5" data-test="task-detail">
            <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h1 class="text-xl font-semibold">{{ task.subject }}</h1>
                    <p class="text-sm opacity-muted">
                        {{ t(`task-kind.${task.kind}`) }} ·
                        {{ formatDateTime(task.createdAt) }}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2">
                    <v-chip size="small" variant="tonal" label data-test="task-status">
                        {{ t(`tasks-page.status-${task.status}`) }}
                    </v-chip>
                    <v-chip
                        v-if="task.dueAt"
                        size="small"
                        variant="tonal"
                        label
                        :color="task.overdue ? 'error' : undefined"
                        data-test="task-due"
                    >
                        {{
                            t(task.overdue ? 'tasks-page.label-overdue' : 'tasks-page.label-due', {
                                date: formatDateTime(task.dueAt)
                            })
                        }}
                    </v-chip>
                </div>
            </div>

            <div v-if="task.email" class="mt-3 text-sm" data-test="task-visitor">
                {{ task.name || t('tasks-page.anonymous') }} —
                <a :href="`mailto:${task.email}`">{{ task.email }}</a>
            </div>
            <p class="mt-3 whitespace-pre-line">{{ task.message }}</p>

            <p v-if="task.link" class="mt-3 text-sm" data-test="task-link">
                {{ t('task-detail-page.label-record') }}:
                <router-link v-if="recordLink" :to="recordLink">
                    {{ t(`task-link.${task.link.type}`) }} {{ task.link.id }}
                </router-link>
                <template v-else>
                    {{ t(`task-link.${task.link.type}`) }} {{ task.link.id }}
                </template>
            </p>

            <p v-if="task.assigneeName" class="mt-3 text-sm" data-test="task-assignee">
                {{ t('tasks-page.label-assignee', { name: task.assigneeName }) }}
            </p>

            <div class="mt-4 flex flex-wrap gap-2">
                <v-btn
                    v-if="task.actions.assign && task.assigneeId !== session.viewer?.id"
                    size="small"
                    variant="tonal"
                    data-test="task-take"
                    @click="
                        handle(
                            () => store.assign(task!.id, session.viewer?.id ?? ''),
                            t('tasks-page.success-take')
                        )
                    "
                >
                    {{ t('tasks-page.button-take') }}
                </v-btn>
                <v-btn
                    v-if="task.actions.unassign"
                    size="small"
                    variant="tonal"
                    data-test="task-give-back"
                    @click="
                        handle(
                            () => store.unassign(task!.id),
                            t('task-detail-page.success-give-back')
                        )
                    "
                >
                    {{ t('task-detail-page.button-give-back') }}
                </v-btn>
                <v-btn
                    v-if="task.actions.resolve"
                    size="small"
                    variant="tonal"
                    data-test="task-resolve"
                    @click="handle(() => store.resolve(task!.id), t('tasks-page.success-status'))"
                >
                    {{ t('tasks-page.button-resolve') }}
                </v-btn>
                <v-btn
                    v-if="task.actions.markSpam"
                    size="small"
                    variant="tonal"
                    data-test="task-spam"
                    @click="handle(() => store.markSpam(task!.id), t('tasks-page.success-status'))"
                >
                    {{ t('tasks-page.button-spam') }}
                </v-btn>
                <v-btn
                    v-if="task.actions.reopen"
                    size="small"
                    variant="tonal"
                    data-test="task-reopen"
                    @click="handle(() => store.reopen(task!.id), t('tasks-page.success-status'))"
                >
                    {{ t('tasks-page.button-reopen') }}
                </v-btn>
            </div>
        </v-card>

        <v-card v-if="task" class="p-5" data-test="task-thread">
            <h2 class="text-lg font-semibold">{{ t('task-detail-page.heading-notes') }}</h2>
            <p class="text-sm opacity-muted">{{ t('task-detail-page.notes-hint') }}</p>
            <ul class="mt-3 flex flex-col gap-2">
                <li
                    v-for="(note, index) in task.notes"
                    :key="'note-' + index"
                    data-test="task-note"
                >
                    <span class="text-sm opacity-muted">{{ formatDateTime(note.at) }}</span>
                    <p class="whitespace-pre-line">{{ note.body }}</p>
                </li>
            </ul>
            <div v-if="task.actions.note" class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <v-textarea
                    v-model="draft"
                    :label="t('task-detail-page.label-note')"
                    maxlength="5000"
                    rows="2"
                    auto-grow
                    density="compact"
                    hide-details
                    class="flex-1"
                    data-test="task-note-draft"
                />
                <v-btn
                    size="small"
                    variant="tonal"
                    :disabled="draft.trim().length === 0"
                    data-test="task-note-add"
                    @click="handleNote"
                >
                    {{ t('task-detail-page.button-add-note') }}
                </v-btn>
            </div>
        </v-card>

        <v-card v-if="task?.earlierTasks?.length" class="p-5" data-test="task-earlier">
            <h2 class="text-lg font-semibold">{{ t('task-detail-page.heading-earlier') }}</h2>
            <ul class="mt-2">
                <li v-for="earlier in task.earlierTasks" :key="earlier.id">
                    <router-link :to="{ name: 'TaskDetail', params: { id: earlier.id } }">
                        {{ t(`tasks-page.status-${earlier.status}`) }} ·
                        {{ formatDateTime(earlier.createdAt) }}
                    </router-link>
                </li>
            </ul>
        </v-card>
    </div>
</template>
