<script lang="ts">
export default {
    name: 'EntityTranslationsPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The generic translation door's own screen: `GET`/`PATCH /translations/{entityType}/{id}`, one
 * tab per language the entity has a row for. Reachable for any `translatables`-registered entity
 * — currently only `product`, linked from `ProductEdit.vue`'s "Translations" action. The field
 * set comes from the response's own `fields`, the registry's declared list for this entity type —
 * never guessed from whatever the fetched rows happen to carry, which would offer nothing for a
 * field no row has filled in yet.
 *
 * Gated on `translations.read` (the route's `meta.can`) for entry, and `translations.update` for
 * the save — the same two keys the API checks, asked of the rules it published.
 */
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { ArrowLeft } from 'lucide-vue-next';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useTranslationTabOrder } from '@/ui/composables/use-translation-tab-order.ts';
import TranslationTabs from '@/ui/organisms/TranslationTabs.vue';
import type { Translation, UpsertTranslationsRequest } from '@types';
import { TranslationOrigin } from '@types';

/**
 * Localized dictionary helper.
 */
const { t } = useI18n();

/**
 * Current route, read for `:entityType`/`:id`.
 */
const route = useRoute();

/**
 * Toast dispatcher.
 */
const { addMessage } = useNotificationsStore();

/**
 * The locales store: the language manifest (for the tab universe) and the two generic
 * translation actions.
 */
const localesStore = useLocalesStore();

/**
 * The manifest and its fallback locale.
 */
const { capabilities, fallbackLocale } = storeToRefs(localesStore);

/**
 * The session, for the two rules this screen renders from: `translations.read` to enter, and
 * `translations.update` for the save. They are separate keys, so a reader sees the languages a
 * product has and no way to change them.
 */
const session = useSessionStore();

/**
 * The entity this screen edits, from the route.
 */
const entityType = computed(() => String(route.params.entityType));
const entityId = computed(() => String(route.params.id));

/**
 * Every active locale — the tab bar's "add language" universe.
 */
const activeLocales = computed(() => capabilities.value.filter((capability) => capability.active));

/**
 * The rows as last fetched, kept around so `handleAddLocale` can restore a removed-then-readded
 * tab's original content instead of blanking it.
 */
const rows = ref<Translation[]>([]);

/**
 * This entity's translatable fields, as declared by the `translatables` registry — the response's
 * own `fields`, not discovered from whichever rows happen to have a value already.
 */
const fieldNames = ref<string[]>([]);

/**
 * The editable draft, one entry per open locale: an object to upsert, or `null` for a tab marked
 * for removal — the same three-way shape `UpsertTranslationsRequest` itself uses, so submission
 * is a direct pass-through.
 */
const drafts = ref<Record<string, Record<string, string> | null>>({});

/**
 * Which locales the LAST fetch actually had a row for — removing one of these sends `null`;
 * removing a tab opened only this session just drops it.
 */
const originalTags = ref<string[]>([]);

/**
 * Which language tabs are open, fallback locale first — derived from `drafts` itself. Shared with
 * the product create/edit forms, which read a differently-shaped record for the same ordering —
 * see `useTranslationTabOrder`.
 */
const openTags = useTranslationTabOrder(() => drafts.value, fallbackLocale);

/**
 * The tab currently shown.
 */
const activeTab = ref<string>();

/**
 * Whether a fetch or save is in flight.
 */
const loading = ref(false);
const saving = ref(false);

/**
 * (Re)loads the manifest (once) and this entity's translation rows, then rebuilds the drafts.
 *
 * @returns A promise resolving once the screen's state reflects the server's.
 */
const load = () => {
    loading.value = true;
    return Promise.all([
        capabilities.value.length === 0 ? localesStore.fetchLanguages() : Promise.resolve(),
        localesStore.fetchEntityTranslations(entityType.value, entityId.value)
    ])
        .then(([, result]) => {
            rows.value = result?.translations ?? [];
            fieldNames.value = result?.fields ?? [];
            const byLocale: Record<string, Record<string, string> | null> = {};
            for (const row of rows.value) byLocale[row.locale] = { ...row.fields };
            drafts.value = byLocale;
            originalTags.value = Object.keys(byLocale);
            activeTab.value = openTags.value[0];
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            loading.value = false;
        });
};

watch([entityType, entityId], () => void load(), { immediate: true });

/**
 * Opens a language tab — one this entity already had a row for comes back with that row's
 * content; a genuinely new one starts with every known field blank.
 *
 * @param tag - The locale to open.
 */
const handleAddLocale = (tag: string) => {
    const restored = rows.value.find((row) => row.locale === tag)?.fields;
    drafts.value = {
        ...drafts.value,
        [tag]: restored
            ? { ...restored }
            : Object.fromEntries(fieldNames.value.map((name) => [name, '']))
    };
    activeTab.value = tag;
};

/**
 * Closes a language tab. One the last fetch already had a row for is marked `null` — the merge's
 * delete signal; one opened only this session, never saved, is dropped outright.
 *
 * @param tag - The locale to close.
 */
const handleRemoveLocale = (tag: string) => {
    if (originalTags.value.includes(tag)) {
        drafts.value = { ...drafts.value, [tag]: null };
    } else {
        const { [tag]: _removed, ...rest } = drafts.value;
        drafts.value = rest;
    }
    if (activeTab.value === tag) activeTab.value = openTags.value[0];
};

/**
 * Saves every open and removed locale in one merging write. A blank field is dropped from its
 * locale's body rather than blocking the save — an empty string is a 422 on the API's own door
 * (never a delete, that is `null`), and `barebones`-shaped rows mean some field is routinely
 * blank on a screen offering every registry field regardless of what a row already has.
 *
 * @returns A promise resolving once the write lands and the screen has reloaded from it; a toast
 *  either way.
 */
const handleSave = () => {
    const body: UpsertTranslationsRequest = {};
    for (const [tag, fields] of Object.entries(drafts.value)) {
        if (fields === null) {
            body[tag] = null;
            continue;
        }
        const nonBlank = Object.fromEntries(
            Object.entries(fields).filter(([, value]) => value !== '')
        );
        body[tag] = { fields: nonBlank, origin: TranslationOrigin.human };
    }

    saving.value = true;
    return localesStore
        .saveEntityTranslations(entityType.value, entityId.value, body)
        .then(() => {
            addMessage(t('entity-translations-page.success-save'));
            return load();
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            saving.value = false;
        });
};
</script>

<template>
    <LayoutDefault id="entity-translations-page" :title="t('entity-translations-page.page-title')">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <v-btn
                variant="text"
                data-test="back-link"
                :to="routerLinkI18n({ name: 'LocalesList' })"
            >
                <ArrowLeft :size="16" class="mr-1" aria-hidden="true" />
                {{ t('entity-translations-page.back') }}
            </v-btn>
            <span class="font-mono text-sm opacity-70" data-test="entity-subject">
                {{ entityType }} / {{ entityId }}
            </span>
        </div>

        <v-card class="p-5">
            <TranslationTabs
                v-model="activeTab"
                :locales="activeLocales"
                :open-tags="openTags"
                :fallback-tag="fallbackLocale"
                @add="handleAddLocale"
                @remove="handleRemoveLocale"
            />

            <p v-if="!loading && openTags.length === 0" class="opacity-75">
                {{ t('entity-translations-page.empty') }}
            </p>

            <!--
                `drafts[tag]!` — every open tab's slot is an object: `null` only ever lands on a
                tab CLOSED by `handleRemoveLocale`, which also removes it from `openTags`.
            -->
            <v-window v-model="activeTab">
                <v-window-item v-for="tag in openTags" :key="tag" :value="tag">
                    <v-textarea
                        v-for="field in fieldNames"
                        :key="field"
                        v-model="drafts[tag]![field]"
                        :label="field"
                        :rows="field === 'description' ? 5 : 1"
                        :hint="
                            drafts[tag]?.[field]
                                ? undefined
                                : t('entity-translations-page.hint-field-blank-skipped')
                        "
                        persistent-hint
                        class="mb-2"
                        data-test="entity-translation-field"
                        :data-field="field"
                    />
                </v-window-item>
            </v-window>

            <v-btn
                v-if="session.can('update', 'Translation')"
                color="primary"
                :loading="saving"
                :disabled="loading || openTags.length === 0"
                data-test="entity-translations-save"
                @click="handleSave"
            >
                {{ t('entity-translations-page.button-save') }}
            </v-btn>
        </v-card>
    </LayoutDefault>
</template>
