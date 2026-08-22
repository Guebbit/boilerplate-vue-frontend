<script setup lang="ts">
import { watch, computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { localesEntrySchema } from '@/modules/locales/schemas.ts';
import type { LocaleTenantDescriptor } from '@types';

/**
 * The "add one entry" dialog. Only adding: a stored entry's key is immutable and its value edits
 * inline in the table, so a row never comes back through here.
 */
const props = defineProps<{
    /** The tenants the API serves, from its registry — what the select offers. */
    tenants: LocaleTenantDescriptor[];
    /** The tenant preselected on open — whatever the page's tenant filter is on. */
    initialTenant?: string;
}>();

const emit = defineEmits<{
    save: [fields: { tenant: string; key: string; value: string }];
}>();

/** Two-way `v-model`, so the dialog neither declares the prop nor re-emits the event by hand. */
const isOpen = defineModel<boolean>({ required: true });

const { t } = useI18n();

/** The heading's id, so the dialog is announced by its title rather than as "dialog". */
const titleId = useId();

/** The first tenant the registry lists — the default when the page has no filter on. */
const defaultTenant = computed(() => props.initialTenant ?? props.tenants.at(0)?.id ?? '');

const { form, formErrors, showFormErrors, handleSubmit, setForm } = useAppForm(
    { tenant: '', key: '', value: '' },
    localesEntrySchema
);

/*
 * Refill on every open rather than on mount: the dialog is a single instance the page reuses, so
 * yesterday's values must not leak into today's add.
 */
watch(isOpen, (open) => {
    if (!open) return;
    setForm({ tenant: defaultTenant.value, key: '', value: '' });
});

const tenantOptions = computed(() =>
    props.tenants.map(({ id, label }) => ({ value: id, title: `${label} (${id})` }))
);

const handleSave = () =>
    handleSubmit(({ tenant, key, value }) => {
        emit('save', { tenant, key, value });
    });
</script>

<template>
    <v-dialog v-model="isOpen" max-width="560" :aria-labelledby="titleId">
        <v-card class="p-5" data-test="entry-form">
            <h2 :id="titleId" class="mb-4 text-lg font-semibold">{{ t('entry-form.title') }}</h2>
            <form novalidate class="flex flex-col gap-3" @submit.prevent="handleSave">
                <v-select
                    v-model="form.tenant"
                    :items="tenantOptions"
                    :label="t('entry-form.label-tenant')"
                    :error-messages="showFormErrors ? (formErrors.tenant ?? []) : []"
                    data-test="entry-tenant"
                />
                <v-text-field
                    v-model="form.key"
                    :label="t('entry-form.label-key')"
                    :hint="t('entry-form.hint-key')"
                    :error-messages="showFormErrors ? (formErrors.key ?? []) : []"
                    persistent-hint
                    class="font-mono"
                    data-test="entry-key"
                />
                <v-textarea
                    v-model="form.value"
                    :label="t('entry-form.label-value')"
                    :error-messages="showFormErrors ? (formErrors.value ?? []) : []"
                    rows="2"
                    auto-grow
                    data-test="entry-value"
                />
                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" @click="isOpen = false">
                        {{ t('entry-form.button-cancel') }}
                    </v-btn>
                    <!--
                        Never disabled on validity: a submit that cannot be pressed explains
                        nothing, while `handleSubmit` shows the messages and says so.
                    -->
                    <v-btn type="submit" color="primary" data-test="entry-save">
                        {{ t('entry-form.button-save') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
