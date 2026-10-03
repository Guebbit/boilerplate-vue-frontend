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
 * The detail screen: one example read from the store's cache by route id, laid out with the shared
 * detail skeleton. It provides the example and a status mutation to `ExampleStatusActions`
 * (provide/inject), and owns the delete.
 */
import { computed } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Calendar, Clock, FileText, Hash, NotebookPen, User } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useExampleStore } from '@/modules/example/store';
import { provideExample } from '@/modules/example/provided.ts';
import ExampleStatusActions from '@/modules/example/components/ExampleStatusActions.vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import { formatDateTime, formatText } from '@/infrastructure/utils/formatters.ts';
import type { ExampleStatus } from '@types';

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
 * The session, for the rules that gate each action.
 */
const session = useSessionStore();

/**
 * Route example id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Store actions.
 */
const { watchExample, updateExample, deleteExample } = useExampleStore();

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
 * The status buttons' own blocked state: they are dedicated controls, so a failure blocks them in
 * place rather than joining a toast queue.
 */
const {
    message: statusError,
    report: reportStatusError,
    clear: clearStatusError
} = useBlockingError();

/**
 * Moves the example to another status. Handed down through provide/inject, so the descendant that
 * renders the buttons never touches the store.
 *
 * @param status - The status to move to.
 */
const changeStatus = (status: ExampleStatus) => {
    if (!id) return Promise.resolve();
    clearStatusError();
    return updateExample(id, { status })
        .then(() => addMessage(t('example-target-page.success-status')))
        .catch((error: unknown) => reportStatusError(error));
};

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
const handleDelete = () => {
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
                    void router.push(routerLinkI18n({ name: 'ExamplesList' }));
                })
                .catch((error: unknown) => reportDeleteError(error));
        });
};
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

            <CardDetail>
                <h3 class="mb-5 text-lg font-semibold">{{ t('generic.details') }}</h3>

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

                <div v-if="currentExample && session.can('update', 'Example')" class="mt-8">
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
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo
                        :title="heroTitle"
                        :description="formatText(currentExample?.ownerName)"
                        accent="secondary"
                    >
                        <template #icon><NotebookPen :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('example-target-page.label-published-at')"
                        :value="formatDateTime(currentExample?.publishedAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        :label="t('example-target-page.label-created-at')"
                        :value="formatDateTime(currentExample?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        :label="t('example-target-page.label-updated-at')"
                        :value="formatDateTime(currentExample?.updatedAt)"
                        :icon="Clock"
                    />
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentExample && session.can('update', 'Example')"
                    color="secondary"
                    data-test="example-go-to-edit"
                    :to="routerLinkI18n({ name: 'ExampleEdit', params: { id } })"
                >
                    {{ t('example-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn
                    v-if="currentExample && session.can('delete', 'Example')"
                    color="error"
                    variant="tonal"
                    data-test="example-delete"
                    @click="handleDelete"
                >
                    {{ t('example-target-page.button-delete') }}
                </v-btn>
                <v-btn variant="text" :to="routerLinkI18n({ name: 'ExamplesList' })">
                    {{ t('example-target-page.button-go-to-list') }}
                </v-btn>
                <InlineErrorAlert :message="deleteError" data-test="example-target-delete-error" />
            </template>
        </ItemDetailLayout>
    </div>
</template>
