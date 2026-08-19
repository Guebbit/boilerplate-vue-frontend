<script lang="ts">
export default {
    name: 'LocalesListPage'
};
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Languages, Plus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import LanguageFormDialog from '@/modules/locales/components/LanguageFormDialog.vue';
import type { LocaleCapability } from '@types';

/**
 * The languages board: every language the deployment offers, from both tiers, each stating what
 * it can actually do.
 *
 * The rows are `LocaleCapability` — the merged manifest — so a row is not always editable: a
 * `static`-only language exists as deployed files alone, with no dynamic record behind it for the
 * admin routes to touch. Those rows show their facts and no buttons, which is the honest
 * rendering of "the API can answer in this, and nobody has registered it for translation".
 *
 * `active` never hides a row HERE: it only decides whether a visitor may select the language.
 * The admin's manifest includes every row, flag attached — the same enabled/disabled chip the
 * products and users lists wear — and the admin is the one who toggles it.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const localesStore = useLocalesStore();
const { capabilities, defaultLocale, fallbackLocale, loading } = storeToRefs(localesStore);

const formOpen = ref(false);
const editing = ref<LocaleCapability | undefined>();

const tableHeaders = computed(() => [
    { title: t('locales-list-page.column-tag'), key: 'tag' },
    { title: t('locales-list-page.column-name'), key: 'name' },
    { title: t('locales-list-page.column-native-name'), key: 'nativeName' },
    { title: t('locales-list-page.column-direction'), key: 'direction' },
    { title: t('locales-list-page.column-scopes'), key: 'scopes' },
    { title: t('locales-list-page.column-source'), key: 'source' },
    { title: t('locales-list-page.column-entries'), key: 'entryCount' },
    { title: t('locales-list-page.column-revision'), key: 'revision' },
    { title: t('locales-list-page.column-active'), key: 'active' },
    { title: t('locales-list-page.column-actions'), key: 'actions' }
]);

const openCreate = () => {
    editing.value = undefined;
    formOpen.value = true;
};

const openEdit = (language: LocaleCapability) => {
    editing.value = language;
    formOpen.value = true;
};

/**
 * Saves the dialog: a create when nothing was being edited, an edit otherwise.
 *
 * @param fields - What the form holds; `tag` only matters on create.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleSave = (fields: {
    tag: string;
    name: string;
    nativeName: string;
    direction: LocaleCapability['direction'];
    active: boolean;
}) => {
    const request = editing.value
        ? localesStore
              .editLanguage(editing.value.tag, {
                  name: fields.name,
                  nativeName: fields.nativeName,
                  direction: fields.direction,
                  active: fields.active
              })
              .then(() => addMessage(t('locales-list-page.success-edit')))
        : localesStore
              .createLanguage(fields)
              .then(() => addMessage(t('locales-list-page.success-create')));
    return request
        .then(() => {
            formOpen.value = false;
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

/**
 * Deletes a language and everything translated into it, after a confirmation that names the cost.
 *
 * An ACTIVE row is deactivated first, because the API refuses to delete one — its guard rail;
 * the confirmation here is this page's half. An already-inactive row goes straight out.
 *
 * @param language - The row being destroyed.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleDelete = (language: LocaleCapability) => {
    const shouldContinue = globalThis.confirm(
        t('locales-list-page.confirm-delete', { tag: language.tag, count: language.entryCount })
    );
    if (!shouldContinue) return;
    // The API refuses to delete an active language — its guard rail; the confirm above is this
    // page's half — so an active row is deactivated first and an inactive one goes straight out.
    const deactivated = language.active
        ? localesStore.editLanguage(language.tag, { active: false })
        : Promise.resolve(undefined);
    return deactivated
        .then(() => localesStore.removeLanguage(language.tag))
        .then(() => addMessage(t('locales-list-page.success-delete')))
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

onMounted(() => {
    void localesStore.fetchLanguages();
});
</script>

<template>
    <LayoutDefault id="locales-list-page" :title="t('locales-list-page.page-title')">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <p class="max-w-2xl text-sm opacity-70">{{ t('locales-list-page.intro') }}</p>
            <v-spacer />
            <v-btn color="primary" data-test="language-create" @click="openCreate">
                <Plus :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locales-list-page.button-create') }}
            </v-btn>
        </div>

        <v-empty-state
            v-if="!loading && capabilities.length === 0"
            :title="t('locales-list-page.empty')"
        >
            <template #media>
                <Languages :size="64" class="text-secondary" aria-hidden="true" />
            </template>
        </v-empty-state>

        <v-table v-else data-test="languages-table">
            <thead>
                <tr>
                    <th v-for="header in tableHeaders" :key="header.key">{{ header.title }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="language in capabilities" :key="language.tag" data-test="language-row">
                    <td>
                        <span class="font-mono">{{ language.tag }}</span>
                        <v-chip
                            v-if="language.tag === defaultLocale"
                            size="x-small"
                            variant="tonal"
                            color="primary"
                            class="ml-1"
                        >
                            {{ t('locales-list-page.chip-default') }}
                        </v-chip>
                        <v-chip
                            v-else-if="language.tag === fallbackLocale"
                            size="x-small"
                            variant="tonal"
                            class="ml-1"
                        >
                            {{ t('locales-list-page.chip-fallback') }}
                        </v-chip>
                    </td>
                    <td>{{ language.name }}</td>
                    <td :dir="language.direction">{{ language.nativeName }}</td>
                    <td>{{ t(`locales-list-page.direction-${language.direction}`) }}</td>
                    <td>
                        <div class="flex gap-1">
                            <!--
                                A native title rather than a v-tooltip: the two scopes are the
                                field doing the real work, and the explanation has to reach a
                                screen reader too — an ARIA tooltip node with no name fails axe.
                            -->
                            <v-chip
                                v-for="scope in language.scopes"
                                :key="scope"
                                size="small"
                                variant="tonal"
                                :color="scope === 'api' ? 'tertiary' : 'secondary'"
                                :title="t(`locales-list-page.scope-${scope}-hint`)"
                                :aria-label="t(`locales-list-page.scope-${scope}-hint`)"
                            >
                                {{ t(`locales-list-page.scope-${scope}`) }}
                            </v-chip>
                        </div>
                    </td>
                    <td>{{ t(`locales-list-page.source-${language.source}`) }}</td>
                    <td>{{ language.entryCount }}</td>
                    <td>{{ language.revision }}</td>
                    <td>
                        <v-chip
                            size="small"
                            variant="tonal"
                            :color="language.active ? 'success' : 'error'"
                            data-test="language-active-chip"
                        >
                            {{ language.active ? t('generic.enabled') : t('generic.disabled') }}
                        </v-chip>
                    </td>
                    <td>
                        <!--
                            A static-only language has no dynamic record behind it: nothing to
                            list, edit or delete until someone registers it with "Add language".
                        -->
                        <div v-if="language.source !== 'static'" class="flex flex-wrap gap-1">
                            <v-btn
                                size="small"
                                variant="tonal"
                                data-test="row-entries"
                                :to="
                                    routerLinkI18n({
                                        name: 'LocaleEntries',
                                        params: { tag: language.tag }
                                    })
                                "
                            >
                                {{ t('locales-list-page.button-entries') }}
                            </v-btn>
                            <v-btn
                                size="small"
                                variant="tonal"
                                color="secondary"
                                data-test="row-edit"
                                @click="openEdit(language)"
                            >
                                {{ t('locales-list-page.button-edit') }}
                            </v-btn>
                            <v-btn
                                size="small"
                                variant="tonal"
                                color="error"
                                data-test="row-delete"
                                :disabled="loading"
                                @click="handleDelete(language)"
                            >
                                {{ t('locales-list-page.button-delete') }}
                            </v-btn>
                        </div>
                    </td>
                </tr>
            </tbody>
        </v-table>

        <LanguageFormDialog v-model="formOpen" :language="editing" @save="handleSave" />
    </LayoutDefault>
</template>
