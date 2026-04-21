<template>
    <LayoutDefault id="user-edit-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('user-edit-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
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
                <BaseButton type="submit" :disabled="isSubmitting || loading">
                    {{ t('user-edit-page.button-submit') }}
                </BaseButton>
                <BaseButton type="button" @click="resetToCurrentUser">
                    {{ t('user-edit-page.reset-form') }}
                </BaseButton>
            </form>
        </div>

        <div class="user-edit-actions">
            <RouterLink v-if="id" :to="routerLinkI18n({ name: 'UserTarget', params: { id } })">
                {{ t('user-edit-page.button-go-to-details') }}
            </RouterLink>
            <RouterLink :to="routerLinkI18n({ name: 'UsersList' })">
                {{ t('user-edit-page.button-go-to-list') }}
            </RouterLink>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserEditPage'
};
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/stores/users';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

/**
 * Generics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Props
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Users store
 */
const { fetchUser, updateUser, zodSchemaUsers, zodSchemaUsersPassword } = useUsersStore();
const { currentUser, selectedUserId, loading } = storeToRefs(useUsersStore());

/**
 * Form definition
 */
interface IUserEditForm {
    email?: string;
    password?: string;
}

/**
 * Password is optional on edit: empty string means "do not change"
 */
const editSchema = zodSchemaUsers.pick({ email: true }).extend({
    password: z.preprocess((v) => (v === '' ? undefined : v), zodSchemaUsersPassword.optional())
});

const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<IUserEditForm>(
    {},
    editSchema
);

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);

/**
 * Reset form to the current user's data
 */
const resetToCurrentUser = () => {
    form.value = {
        email: currentUser.value?.email ?? '',
        password: ''
    };
    showErrors.value = false;
};

/**
 * When the user data is loaded, pre-fill the form
 */
watch(
    currentUser,
    (user) => {
        if (user) resetToCurrentUser();
    },
    { immediate: true }
);

/**
 * Submit form and update the user
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

/**
 * Load user data on mount
 */
if (id) {
    selectedUserId.value = id;
    fetchUser(id);
}
</script>

<style lang="scss">
#user-edit-page {
    .theme-form-container {
        max-width: 600px;
        margin: 100px auto;
        padding: 2rem;
    }

    .user-edit-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
    }
}
</style>
