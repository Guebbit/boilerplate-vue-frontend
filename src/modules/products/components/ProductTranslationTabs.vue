<script setup lang="ts">
/**
 * @module
 * The tab bar every per-language product form (create, edit) shares: one tab per open locale,
 * the fallback locale first and never removable, an error-count badge per tab, an "add language"
 * picker for any active locale not open yet, and a remove button on every other open tab.
 *
 * Purely presentational — `v-model` is the active tab, `add`/`remove` report the admin's intent,
 * and the caller (`ProductCreate.vue`/`ProductEdit.vue`) owns the actual form data per locale.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus, X } from 'lucide-vue-next';

/**
 * One language the tab bar can offer — a `LocaleCapability`, narrowed to the three fields this
 * component reads.
 */
export interface TranslationTabLocale {
    tag: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
}

const { locales, openTags, fallbackTag, errorCounts } = defineProps<{
    /**
     * Every active locale this deployment offers — the universe the "add language" picker
     * chooses from.
     */
    locales: TranslationTabLocale[];

    /**
     * Which locales currently have a tab, in display order. The fallback locale (see
     * {@link fallbackTag}) is expected first.
     */
    openTags: string[];

    /**
     * The deployment's fallback locale. Its tab renders with no remove button: `null` on that
     * slot is a 422, so the UI never offers the action that would produce it.
     */
    fallbackTag?: string;

    /**
     * Error count per open locale, from `translationTabErrorCounts` — a tab with a positive
     * count wears a badge.
     */
    errorCounts: Record<string, number>;
}>();

/**
 * The active tab, owned by the caller.
 */
const activeTab = defineModel<string | undefined>({ required: true });

/**
 * Emits: `add` when a new language is picked from the closed-locales select, `remove` when a
 * tab's own remove button is clicked.
 */
const emit = defineEmits<{ add: [tag: string]; remove: [tag: string] }>();

const { t } = useI18n();

/**
 * `locales`, resolved to a display row per open tab — falls back to the bare tag when the
 * manifest has not loaded yet, so the bar never renders blank while `GET /locales` is in flight.
 */
const openLocales = computed(() =>
    openTags.map(
        (tag) =>
            locales.find((locale) => locale.tag === tag) ?? {
                tag,
                nativeName: tag,
                direction: 'ltr' as const
            }
    )
);

/**
 * Active locales with no tab open yet — what the "add language" select offers.
 */
const closedLocales = computed(() => locales.filter(({ tag }) => !openTags.includes(tag)));

/**
 * The "add language" select's own model — always reset to `null` once a pick is reported, so the
 * control reads as a one-shot action rather than a language that stays "selected".
 */
const addSelection = ref<string | null>(null);

/**
 * Reports a language pick and resets the select.
 *
 * @param tag - The picked locale, or `null` when the select was cleared.
 */
const handlePick = (tag: string | null) => {
    if (tag) emit('add', tag);
    addSelection.value = null;
};
</script>

<template>
    <div class="mb-4 flex flex-wrap items-center gap-2">
        <v-tabs v-model="activeTab" data-test="translation-tabs">
            <v-tab
                v-for="locale in openLocales"
                :key="locale.tag"
                :value="locale.tag"
                :data-test="`translation-tab-${locale.tag}`"
            >
                <v-badge
                    :model-value="Boolean(errorCounts[locale.tag])"
                    :content="errorCounts[locale.tag]"
                    :label="
                        t('product-translation-tabs.error-count', {
                            count: errorCounts[locale.tag] ?? 0
                        })
                    "
                    color="error"
                    :data-test="errorCounts[locale.tag] ? 'translation-tab-error-badge' : undefined"
                >
                    <span :dir="locale.direction">{{ locale.nativeName }}</span>
                </v-badge>
                <v-btn
                    v-if="locale.tag !== fallbackTag"
                    icon
                    size="x-small"
                    variant="text"
                    density="compact"
                    class="ml-1"
                    data-test="translation-tab-remove"
                    :aria-label="
                        t('product-translation-tabs.button-remove-language', {
                            name: locale.nativeName
                        })
                    "
                    @click.stop="emit('remove', locale.tag)"
                >
                    <X :size="14" aria-hidden="true" />
                </v-btn>
            </v-tab>
        </v-tabs>

        <v-select
            v-if="closedLocales.length > 0"
            v-model="addSelection"
            :items="closedLocales"
            item-title="nativeName"
            item-value="tag"
            :label="t('product-translation-tabs.label-add-language')"
            hide-details
            density="compact"
            class="max-w-56"
            data-test="translation-tab-add"
            @update:model-value="handlePick"
        >
            <template #prepend>
                <Plus :size="16" aria-hidden="true" />
            </template>
        </v-select>
    </div>
</template>
