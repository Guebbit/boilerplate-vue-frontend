<script lang="ts">
export default {
    name: 'LocalesListPage'
};
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { BookOpenText, Languages, Plus } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useLocalesStore } from '@/modules/locales/store.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import LanguageFormDialog from '@/modules/locales/components/LanguageFormDialog.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import type { LocaleCapability } from '@types';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

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
const { capabilities, tenants, defaultLocale, fallbackLocale, loading } = storeToRefs(localesStore);

const formOpen = ref(false);
const editing = ref<LocaleCapability | undefined>();

const tableHeaders = computed<CoreDataTableHeader<LocaleCapability>[]>(() => [
    { title: t('locales-list-page.column-tag'), key: 'tag' },
    { title: t('locales-list-page.column-name'), key: 'name' },
    { title: t('locales-list-page.column-native-name'), key: 'nativeName' },
    { title: t('locales-list-page.column-direction'), key: 'direction' },
    { title: t('locales-list-page.column-tenants'), key: 'tenants' },
    { title: t('locales-list-page.column-source'), key: 'source' },
    { title: t('locales-list-page.column-entries'), key: 'entryCount' },
    { title: t('locales-list-page.column-revision'), key: 'revision' },
    { title: t('locales-list-page.column-active'), key: 'active' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('locales-list-page.column-actions'), key: 'actions', synthetic: true }
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
    return useDialogStore()
        .confirm({
            message: t('locales-list-page.confirm-delete', {
                tag: language.tag,
                count: language.entryCount
            }),
            color: 'error'
        })
        .then((accepted) => {
            if (!accepted) return;
            // The API refuses to delete an active language — its guard rail; the confirm above
            // is this page's half — so an active row is deactivated first and an inactive one
            // goes straight out.
            const deactivated = language.active
                ? localesStore.editLanguage(language.tag, { active: false })
                : Promise.resolve(undefined);
            return deactivated
                .then(() => localesStore.removeLanguage(language.tag))
                .then(() => addMessage(t('locales-list-page.success-delete')))
                .catch((error: unknown) => notifyErrorMessages(addMessage, error));
        });
};

/** What kind of tenant an id is, for the chip's colour and hint; `frontend` until the registry answers. */
const tenantKind = (id: string) =>
    tenants.value.find((tenant) => tenant.id === id)?.kind ?? 'frontend';

onMounted(() => {
    void localesStore.fetchLanguages();
    void localesStore.fetchTenants();
});
</script>

<template>
    <LayoutDefault id="locales-list-page" :title="t('locales-list-page.page-title')">
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <p class="max-w-2xl text-sm opacity-70">{{ t('locales-list-page.intro') }}</p>
            <v-spacer />
            <v-btn
                variant="tonal"
                data-test="dictionary-link"
                :to="routerLinkI18n({ name: 'LocalesDictionary' })"
            >
                <BookOpenText :size="16" class="mr-1" aria-hidden="true" />
                {{ t('locales-list-page.button-dictionary') }}
            </v-btn>
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

        <DataTable
            v-else
            :headers="tableHeaders"
            :items="capabilities"
            :caption="t('locales-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            :no-data-text="t('generic.no-data')"
            item-value="tag"
        >
            <template v-slot:[`item.tag`]="{ item }">
                <span class="font-mono">{{ item.tag }}</span>
                <v-chip
                    v-if="item.tag === defaultLocale"
                    size="small"
                    variant="tonal"
                    color="primary"
                    class="ml-1"
                >
                    {{ t('locales-list-page.chip-default') }}
                </v-chip>
                <v-chip
                    v-else-if="item.tag === fallbackLocale"
                    size="small"
                    variant="tonal"
                    class="ml-1"
                >
                    {{ t('locales-list-page.chip-fallback') }}
                </v-chip>
            </template>

            <template v-slot:[`item.nativeName`]="{ item }">
                <span :dir="item.direction">{{ item.nativeName }}</span>
            </template>

            <template v-slot:[`item.direction`]="{ item }">
                {{ t(`locales-list-page.direction-${item.direction}`) }}
            </template>

            <template v-slot:[`item.tenants`]="{ item }">
                <div class="flex gap-1">
                    <!--
                        A native title rather than a v-tooltip: the tenants are the field doing
                        the real work, and the explanation has to reach a screen reader too — an
                        ARIA tooltip node with no name fails axe. A non-interactive chip renders
                        as a role-less span, so the explanation is a visually-hidden sibling
                        rather than an `aria-label` (`aria-prohibited-attr`).
                    -->
                    <v-chip
                        v-for="tenant in item.tenants"
                        :key="tenant"
                        size="small"
                        variant="tonal"
                        :color="tenantKind(tenant) === 'backend' ? 'tertiary' : 'secondary'"
                        :title="t(`locales-list-page.tenant-${tenantKind(tenant)}-hint`)"
                    >
                        {{ localesStore.tenantLabel(tenant) }}
                        <span class="sr-only">
                            {{ t(`locales-list-page.tenant-${tenantKind(tenant)}-hint`) }}
                        </span>
                    </v-chip>
                </div>
            </template>

            <template v-slot:[`item.source`]="{ item }">
                {{ t(`locales-list-page.source-${item.source}`) }}
            </template>

            <template v-slot:[`item.active`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="item.active ? 'success' : 'error'"
                    data-test="language-active-chip"
                >
                    {{ item.active ? t('generic.enabled') : t('generic.disabled') }}
                </v-chip>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <!--
                    A static-only language has no dynamic record behind it: nothing to list, edit
                    or delete until someone registers it with "Add language".
                -->
                <div v-if="item.source !== 'static'" class="flex flex-wrap gap-1">
                    <v-btn
                        size="small"
                        variant="tonal"
                        data-test="row-entries"
                        :aria-label="t('locales-list-page.button-entries-named', { tag: item.tag })"
                        :to="
                            routerLinkI18n({
                                name: 'LocaleEntries',
                                params: { tag: item.tag }
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
                        :aria-label="t('locales-list-page.button-edit-named', { tag: item.tag })"
                        @click="openEdit(item)"
                    >
                        {{ t('locales-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="tonal"
                        color="error"
                        data-test="row-delete"
                        :aria-label="t('locales-list-page.button-delete-named', { tag: item.tag })"
                        :disabled="loading"
                        @click="handleDelete(item)"
                    >
                        {{ t('locales-list-page.button-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <LanguageFormDialog v-model="formOpen" :language="editing" @save="handleSave" />
    </LayoutDefault>
</template>
