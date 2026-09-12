<script setup lang="ts">
/**
 * @module
 * The tab bar every per-locale translation screen shares — the product create/edit forms and the
 * generic entity-translations screen: one tab per open locale, the fallback locale first and
 * never removable, an optional error-count badge per tab, an "add language" picker for any active
 * locale not open yet, and one remove button beside the bar that acts on whichever tab is active.
 *
 * The remove control sits outside `<v-tabs>` on purpose: axe's `nested-interactive` flags any
 * focusable control inside a `role="tab"`, and a sibling `<button>` inside `role="tablist"` trips
 * `aria-required-children` instead — no shape with the button inside the tab bar satisfies both.
 * Every tab also carries `id`/`aria-controls` pointing at the matching `v-window-item`, which the
 * caller completes with `role="tabpanel"`/`aria-labelledby` — the WAI-ARIA APG tabs pattern,
 * finished rather than half-wired.
 *
 * Purely presentational — `v-model` is the active tab, `add`/`remove` report the caller's intent,
 * and the caller owns the actual per-locale data and its ordering (see `useTranslationTabOrder`).
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

const {
    locales,
    openTags,
    fallbackTag,
    errorCounts = {}
} = defineProps<{
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
     * The deployment's fallback locale. The remove button hides whenever this is the active tab:
     * `null` on that slot is a 422, so the UI never offers the action that would produce it.
     */
    fallbackTag?: string;

    /**
     * Error count per open locale. A tab with a positive count wears a badge. Optional: a caller
     * with no per-tab validation (the generic entity-translations screen) simply omits it.
     */
    errorCounts?: Record<string, number>;
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
 * The active tab's own row, for the single remove button's label — `undefined` before the first
 * tab settles, same window as `activeTab` itself being `undefined`.
 */
const activeLocale = computed(() => openLocales.value.find(({ tag }) => tag === activeTab.value));

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
                :id="`translation-tab-${locale.tag}`"
                :aria-controls="`translation-panel-${locale.tag}`"
                :data-test="`translation-tab-${locale.tag}`"
            >
                <v-badge
                    :model-value="Boolean(errorCounts[locale.tag])"
                    :content="errorCounts[locale.tag]"
                    :label="
                        t('translation-tabs.error-count', {
                            count: errorCounts[locale.tag] ?? 0
                        })
                    "
                    color="error"
                    :data-test="errorCounts[locale.tag] ? 'translation-tab-error-badge' : undefined"
                >
                    <span :dir="locale.direction">{{ locale.nativeName }}</span>
                </v-badge>
            </v-tab>
        </v-tabs>

        <v-btn
            v-if="activeLocale && activeLocale.tag !== fallbackTag"
            icon
            size="x-small"
            variant="text"
            density="compact"
            data-test="translation-tab-remove"
            :aria-label="
                t('translation-tabs.button-remove-language', {
                    name: activeLocale.nativeName
                })
            "
            @click="emit('remove', activeLocale.tag)"
        >
            <X :size="14" aria-hidden="true" />
        </v-btn>

        <v-select
            v-if="closedLocales.length > 0"
            v-model="addSelection"
            :items="closedLocales"
            item-title="nativeName"
            item-value="tag"
            :label="t('translation-tabs.label-add-language')"
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
