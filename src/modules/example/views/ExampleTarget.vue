<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ExampleTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * In any module: a detail screen reads one record from the cache by route id and lays it out with the
 * shared detail skeleton; every control follows the record's own `actions`.
 * Here: provides the example and a status mutation to `ExampleStatusActions`, and owns the delete.
 * See: docs/theory/request-flow.md
 */
import { computed } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Calendar, Clock, FileText, Hash, NotebookPen, User } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useExampleStore } from '../store';
import { provideExample } from '../provided.ts';
import ExampleStatusActions from '../components/ExampleStatusActions.vue';
import { useDialogStore } from '@/ui/dialog.ts';
import { singleFlight } from '@/infrastructure/utils/single-flight.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import RecordAsideCard from '@/ui/organisms/RecordAsideCard.vue';
import type { DetailFieldRow } from '@/ui/types.ts';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import { formatDateTime, formatText } from '@/infrastructure/utils/formatters.ts';
import { publicationOf } from '../domain';
import { useExampleTransition } from '../composables/use-example-transition.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Router instance, for the navigation after a delete.
 */
const router = useRouter();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Route example id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Store actions.
 */
const { watchExample, deleteExample } = useExampleStore();

/**
 * The example being displayed.
 */
const { currentExample } = storeToRefs(useExampleStore());

/**
 * What a 404 or 403 on the routed record does: the Error page, not a page left on placeholders.
 */
const onMissingRecord = useMissingRecord();

/**
 * Selects and hydrates the example whenever the route id changes.
 */
watchExample(() => id, { onError: onMissingRecord });

/**
 * The status buttons' own blocked state and the move itself: they are dedicated controls, so a
 * failure blocks them in place rather than joining a toast queue, and a 409 re-reads the record.
 * `changeStatus` is handed down through provide/inject, so the descendant that renders the buttons
 * never touches the store.
 */
const { changeStatus, error: statusError } = useExampleTransition(() => id);

/**
 * The providing half of the provide/inject pair; `ExampleStatusActions` is the injecting half.
 * Reachable by every descendant of this page and by nothing above it, which is the scope the
 * mechanism actually has.
 */
provideExample({ example: currentExample, changeStatus });

/**
 * Hero heading.
 *
 * @returns The example's title, the route id while loading, or the page title as a last resort.
 */
const heroTitle = computed(
    () => currentExample.value?.title ?? id ?? t('example-target-page.page-title')
);

/**
 * The delete button's own blocked state.
 */
const {
    message: deleteError,
    report: reportDeleteError,
    clear: clearDeleteError
} = useBlockingError();

/**
 * Deletes this example after an explicit confirmation, then returns to the list: there is nothing
 * left on this page to show.
 */
const handleDelete = singleFlight(() => {
    if (!id) return;
    return useDialogStore()
        .confirm({
            message: t('example-target-page.confirm-delete', { title: heroTitle.value }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            clearDeleteError();
            return deleteExample(id)
                .then(() => {
                    addMessage(t('example-target-page.success-delete'));
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- vue-router reports a failed navigation through router.onError (app/router/index.ts)
                    void router.push(routerLinkI18n({ name: 'ExamplesList' }));
                })
                .catch((error: unknown) => reportDeleteError(error));
        });
});

/**
 * What the example's publication reads as: live, withdrawn (with the first publish) or never.
 *
 * @returns The localized sentence, empty while the example loads.
 */
const publicationText = computed(() => {
    if (!currentExample.value) return '';
    const { state, firstPublishedAt } = publicationOf(currentExample.value);
    return t(`example-publication.${state}`, { date: formatDateTime(firstPublishedAt) });
});

/**
 * The rows of the aside summary card: identity and timestamps, formatted for display.
 */
const asideFields = computed<DetailFieldRow[]>(() => [
    {
        label: t('example-target-page.label-publication'),
        value: publicationText.value,
        icon: Calendar,
        test: 'example-publication'
    },
    {
        label: t('example-target-page.label-created-at'),
        value: formatDateTime(currentExample.value?.createdAt),
        icon: Calendar
    },
    {
        label: t('example-target-page.label-updated-at'),
        value: formatDateTime(currentExample.value?.updatedAt),
        icon: Clock
    }
]);
</script>

<template>
    <div id="example-target">
        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="formatText(currentExample?.ownerName)"
                    :eyebrow="id"
                >
                    <template #icon><NotebookPen :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('example-target-page.label-status')"
                    :value="currentExample ? t(`example-status.${currentExample.status}`) : '—'"
                    data-test="example-target-status"
                />
            </template>

            <CardDetail :title="t('generic.details')">
                <div v-if="currentExample" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('example-target-page.label-body')"
                        :value="currentExample.body"
                        :icon="FileText"
                        full-width
                    />
                    <ItemDetailField
                        :label="t('example-target-page.label-owner')"
                        :value="currentExample.ownerName"
                        :icon="User"
                    />
                    <ItemDetailField
                        :label="t('example-target-page.label-id')"
                        :value="currentExample.id"
                        :icon="Hash"
                    />
                    <ItemDetailField
                        v-if="currentExample.imageUrl"
                        :label="t('example-target-page.label-cover')"
                        :icon="FileText"
                        full-width
                    >
                        <LazyImage
                            :src="currentExample.imageUrl"
                            :thumbnail-src="currentExample.thumbnailUrl"
                            :alt="
                                t('example-target-page.cover-alt', { title: currentExample.title })
                            "
                            :width="240"
                            :height="160"
                        />
                    </ItemDetailField>
                </div>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>

                <div v-if="currentExample?.actions?.transitions.length" class="mt-8">
                    <h3 class="mb-3 text-lg font-semibold">
                        {{ t('example-target-page.section-status') }}
                    </h3>
                    <ExampleStatusActions />
                    <InlineErrorAlert
                        :message="statusError"
                        class="mt-3"
                        data-test="example-target-status-error"
                    />
                </div>
            </CardDetail>

            <template #aside>
                <RecordAsideCard
                    :title="heroTitle"
                    :description="formatText(currentExample?.ownerName)"
                    accent="secondary"
                    :fields="asideFields"
                >
                    <template #icon><NotebookPen :size="28" /></template>
                </RecordAsideCard>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentExample?.actions?.update"
                    color="secondary"
                    data-test="example-go-to-edit"
                    :to="routerLinkI18n({ name: 'ExampleEdit', params: { id } })"
                >
                    {{ t('example-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn
                    v-if="currentExample?.actions?.delete"
                    color="error"
                    variant="tonal"
                    data-test="example-delete"
                    @click="handleDelete"
                >
                    {{ t('example-target-page.button-delete') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'ExamplesList' })">
                    {{ t('example-target-page.button-go-to-list') }}
                </v-btn>
                <InlineErrorAlert :message="deleteError" data-test="example-target-delete-error" />
            </template>
        </ItemDetailLayout>
    </div>
</template>
