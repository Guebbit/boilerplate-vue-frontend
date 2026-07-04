<template>
    <LayoutDefault id="user-edit-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('user-edit-page.page-title') }}</span>
            </h1>
        </template>

        <VRow class="mb-6" dense>
            <VCol cols="12" lg="6">
                <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                    <template #icon><VIcon icon="$pencil" size="32" /></template>
                </ItemDetailHero>
            </VCol>
            <VCol cols="12" sm="4" lg="2">
                <CardMaterialStat
                    :title="t('user-target-page.label-id')"
                    :value="id ?? EMPTY_VALUE"
                />
            </VCol>
            <VCol cols="12" sm="4" lg="2">
                <CardMaterialStat
                    :title="t('user-target-page.label-admin')"
                    :value="userRole"
                    accent="secondary"
                />
            </VCol>
            <VCol cols="12" sm="4" lg="2">
                <CardMaterialStat
                    :title="t('user-target-page.label-active')"
                    :value="userStatus"
                    accent="tertiary"
                />
            </VCol>
        </VRow>

        <VRow dense>
            <VCol cols="12" lg="8">
                <CardDetail>
                    <div class="mb-4">
                        <h3 class="text-h6">{{ t('generic.details') }}</h3>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                            {{ t('user-edit-page.page-title') }}
                        </p>
                    </div>

                    <form class="d-flex flex-column ga-4" @submit.prevent="submitForm">
                        <BaseInput
                            v-model="form.email"
                            type="email"
                            :label="t('user-edit-page.label-email')"
                            :errors="formErrors.email"
                            :show-errors="showErrors"
                        />
                        <BaseInput
                            v-model="form.password"
                            type="password"
                            :label="t('user-edit-page.label-password')"
                            :errors="formErrors.password"
                            :show-errors="showErrors"
                        />

                        <div class="d-flex flex-wrap ga-3 justify-end">
                            <BaseButton type="submit" :disabled="isSubmitting || loading">
                                {{ t('user-edit-page.button-submit') }}
                            </BaseButton>
                            <BaseButton type="button" @click="resetForm">
                                {{ t('user-edit-page.reset-form') }}
                            </BaseButton>
                        </div>
                    </form>
                </CardDetail>
            </VCol>

            <VCol cols="12" lg="4">
                <CardDetail as="aside">
                    <div class="d-flex flex-column ga-4">
                        <CardInfo
                            :title="heroTitle"
                            :description="heroDescription"
                            variant="secondary"
                        >
                            <template #icon><VIcon icon="$account" size="28" /></template>
                        </CardInfo>
                        <ItemDetailField
                            :label="t('user-target-page.label-id')"
                            :value="id ?? EMPTY_VALUE"
                            icon="#"
                        />
                        <ItemDetailField
                            :label="t('user-target-page.label-created-at')"
                            :value="formatDateTime(currentUser?.createdAt)"
                            icon="📅"
                        />
                        <ItemDetailField
                            :label="t('user-target-page.label-updated-at')"
                            :value="formatDateTime(currentUser?.updatedAt)"
                            icon="🕘"
                        />
                    </div>
                </CardDetail>
            </VCol>
        </VRow>

        <div class="d-flex flex-wrap ga-3 mt-6">
            <VBtn
                v-if="id"
                :to="routerLinkI18n({ name: 'UserTarget', params: { id } })"
                color="primary"
            >
                <VIcon icon="$eye" start />
                {{ t('user-edit-page.button-go-to-details') }}
            </VBtn>
            <VBtn :to="routerLinkI18n({ name: 'UsersList' })" variant="tonal">
                {{ t('user-edit-page.button-go-to-list') }}
            </VBtn>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserEditPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/features/users/store';
import { z } from 'zod';
import { VBtn, VCol, VIcon, VRow } from 'vuetify/components';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { EMPTY_VALUE } from '@/utils/constants.ts';

/*
 * Generic i18n/notifications helpers.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/*
 * User id route param.
 */
const { id } = defineProps<{
    id?: string;
}>();

/*
 * User store APIs and references.
 */
const { fetchUser, updateUser, zodSchemaUsers, zodSchemaUsersPassword } = useUsersStore();
const { currentUser, selectedUserId, loading } = storeToRefs(useUsersStore());

/*
 * Shared display formatting helpers.
 */
const { formatText, formatDateTime, formatFlag } = useItemDetailDisplay();

/*
 * Edit form data model.
 */
interface IUserEditForm {
    email?: string;
    password?: string;
}

/*
 * Edit validation schema with optional password replacement.
 */
const editSchema = zodSchemaUsers.pick({ email: true }).extend({
    password: z.preprocess((v) => (v === '' ? undefined : v), zodSchemaUsersPassword.optional())
});

/*
 * Toolkit form bindings.
 */
const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<IUserEditForm>(
    {},
    editSchema
);

/*
 * Shared watcher-based form hydration.
 */
const { showErrors, resetForm } = useItemDetailForm({
    currentItem: currentUser,
    form,
    mapToForm: (user) => ({
        email: user?.email ?? '',
        password: ''
    })
});

/*
 * Hero and status labels.
 */
const heroTitle = computed(
    () => currentUser.value?.username ?? id ?? t('user-edit-page.page-title')
);
const heroDescription = computed(() => formatText(currentUser.value?.email));
const userRole = computed(() =>
    formatFlag(currentUser.value?.admin, t('generic.administrator'), t('generic.standard-user'))
);
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/*
 * Validates and persists user updates.
 */
const submitForm = () =>
    handleSubmit(async () => {
        if (!id) return;
        await updateUser(id, {
            email: form.value.email,
            password: form.value.password || undefined
        });
        addMessage(t('user-edit-page.success-update'));
        showErrors.value = false;
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));

/*
 * Activates route selection + onBeforeMount record load.
 */
useItemDetailRecord({
    id,
    selectedId: selectedUserId,
    fetchRecord: fetchUser
});
</script>
