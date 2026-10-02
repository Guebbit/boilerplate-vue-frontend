<script lang="ts">
export default {
    name: 'ExamplePublishedPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The public screen: one published example, readable with no account. It reads through the
 * store's public call and holds the answer locally instead of in the signed-in cache, since a
 * stranger's read and an owner's list are different answers. A draft, an archived one and an id
 * that does not exist all answer 404 from the server, and all land on the shell's Error page.
 */
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { NotebookPen } from 'lucide-vue-next';
import { useExampleStore } from '@/modules/example/store';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { formatDateTime, formatText } from '@/infrastructure/utils/formatters.ts';
import LazyImage from '@/ui/molecules/LazyImage.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import type { Example } from '@types';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Route example id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Store action.
 */
const { fetchPublished } = useExampleStore();

/**
 * The example being displayed, `undefined` while it loads.
 */
const example = ref<Example>();

/**
 * What a 404 does: the Error page, not a page left on its placeholders.
 */
const onMissingRecord = useMissingRecord();

/**
 * Reads the example whenever the route id changes.
 */
watch(
    () => id,
    (current) => {
        example.value = undefined;
        if (!current) return;
        return fetchPublished(current)
            .then((found) => {
                example.value = found;
            })
            .catch(onMissingRecord);
    },
    { immediate: true }
);
</script>

<template>
    <div id="example-published-page">
        <ItemDetailLayout accent="secondary">
            <template #hero>
                <ItemDetailHero
                    :title="example?.title ?? t('example-published-page.page-title')"
                    :description="formatText(example?.ownerName)"
                >
                    <template #icon><NotebookPen :size="32" /></template>
                </ItemDetailHero>
            </template>

            <CardDetail>
                <template v-if="example">
                    <LazyImage
                        v-if="example.imageUrl"
                        :src="example.imageUrl"
                        :thumbnail-src="example.thumbnailUrl"
                        :alt="t('example-target-page.cover-alt', { title: example.title })"
                        :width="320"
                        :height="200"
                        class="mb-4"
                    />
                    <p class="whitespace-pre-line" data-test="example-published-body">
                        {{ example.body }}
                    </p>
                    <p class="mt-6 text-sm opacity-75">
                        {{
                            t('example-published-page.published-by', {
                                owner: example.ownerName,
                                date: formatDateTime(example.publishedAt)
                            })
                        }}
                    </p>
                </template>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>
            </CardDetail>
        </ItemDetailLayout>
    </div>
</template>
