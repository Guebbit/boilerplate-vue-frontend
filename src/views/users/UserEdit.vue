<template>
    <ItemDetailPage
        page-id="user-edit-page"
        page-class="user-detail"
        :page-title="t('user-edit-page.page-title')"
        :hero-eyebrow="id"
        :hero-title="heroTitle"
        :hero-description="heroDescription"
        hero-icon="✏️"
        :section-title="t('generic.details')"
        :section-description="t('user-edit-page.page-title')"
        edit-mode
        @submit="submitForm"
    >
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

        <div class="item-detail__form-actions">
            <BaseButton type="submit" :disabled="isSubmitting || loading">
                {{ t('user-edit-page.button-submit') }}
            </BaseButton>
            <BaseButton type="button" @click="resetForm">
                {{ t('user-edit-page.reset-form') }}
            </BaseButton>
        </div>

        <template #stats>
            <MaterialStatCard :title="t('user-target-page.label-id')" :value="id ?? emptyValue" />
            <MaterialStatCard :title="t('user-target-page.label-admin')" :value="userRole" accent="secondary" />
            <MaterialStatCard :title="t('user-target-page.label-active')" :value="userStatus" accent="tertiary" />
        </template>

        <template #aside>
            <MaterialGraphicCard :title="heroTitle" :description="heroDescription" variant="secondary" />
            <ItemDetailField :label="t('user-target-page.label-id')" :value="id ?? emptyValue" icon="#" />
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
        </template>

        <template #actions>
            <RouterLink v-if="id" :to="routerLinkI18n({ name: 'UserTarget', params: { id } })" class="theme-button">
                {{ t('user-edit-page.button-go-to-details') }}
            </RouterLink>
            <RouterLink :to="routerLinkI18n({ name: 'UsersList' })" class="theme-button">
                {{ t('user-edit-page.button-go-to-list') }}
            </RouterLink>
        </template>
    </ItemDetailPage>
</template>

<script lang="ts">
export default {
    name: 'UserEditPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/stores/users';
import { z } from 'zod';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailPage from '@/components/organisms/ItemDetailPage.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { id } = defineProps<{
    id?: string;
}>();

const { fetchUser, updateUser, zodSchemaUsers, zodSchemaUsersPassword } = useUsersStore();
const { currentUser, selectedUserId, loading } = storeToRefs(useUsersStore());
const { emptyValue, formatText, formatDateTime, formatFlag } = useItemDetailDisplay();

interface IUserEditForm {
    email?: string;
    password?: string;
}

const editSchema = zodSchemaUsers.pick({ email: true }).extend({
    password: z.preprocess((v) => (v === '' ? undefined : v), zodSchemaUsersPassword.optional())
});

const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<IUserEditForm>(
    {},
    editSchema
);

const { showErrors, resetForm } = useItemDetailForm({
    currentItem: currentUser,
    form,
    mapToForm: (user) => ({
        email: user?.email ?? '',
        password: ''
    })
});

const heroTitle = computed(() => currentUser.value?.username ?? id ?? t('user-edit-page.page-title'));
const heroDescription = computed(() => formatText(currentUser.value?.email));
const userRole = computed(() =>
    formatFlag(currentUser.value?.admin, t('generic.administrator'), t('generic.standard-user'))
);
const userStatus = computed(() =>
    formatFlag(currentUser.value?.active, t('generic.enabled'), t('generic.disabled'))
);

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

useItemDetailRecord({
    id,
    selectedId: selectedUserId,
    fetchRecord: fetchUser
});
</script>
