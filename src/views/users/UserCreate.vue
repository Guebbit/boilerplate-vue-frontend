<template>
    <LayoutDefault id="user-create-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('user-create-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
                <BaseInput
                    v-model="form.email"
                    type="email"
                    :label="t('user-create-page.label-email')"
                    :errors="formErrors.email"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.username"
                    type="text"
                    :label="t('user-create-page.label-username')"
                    :errors="formErrors.username"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.password"
                    type="password"
                    :label="t('user-create-page.label-password')"
                    :errors="formErrors.password"
                    :show-errors="showErrors"
                />
                <BaseCheckbox v-model="form.admin" :label="t('user-create-page.label-admin')" />
                <BaseCheckbox v-model="form.active" :label="t('user-create-page.label-active')" />
                <BaseButton type="submit" :disabled="isSubmitting">
                    {{ t('user-create-page.button-submit') }}
                </BaseButton>
            </form>
        </div>

        <RouterLink :to="routerLinkI18n({ name: 'UsersList' })">
            {{ t('user-create-page.button-go-to-list') }}
        </RouterLink>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'UserCreatePage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/stores/users';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseCheckbox from '@/components/atoms/BaseCheckbox.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

/**
 * Generics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();

/**
 * Users store
 */
const { createUser, zodSchemaUsers, zodSchemaUsersPassword } = useUsersStore();

/**
 * Form definition
 */
interface IUserCreateForm {
    email?: string;
    username?: string;
    password?: string;
    admin?: boolean;
    active?: boolean;
}

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IUserCreateForm>(
        {},
        zodSchemaUsers.pick({ email: true, username: true }).extend({
            password: zodSchemaUsersPassword,
            admin: z.boolean().optional(),
            active: z.boolean().optional()
        })
    );

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);

/**
 * Submit form and create a new user
 */
const submitForm = () =>
    handleSubmit(async () => {
        const newUser = await createUser({
            email: form.value.email!,
            username: form.value.username!,
            password: form.value.password!,
            admin: form.value.admin,
            active: form.value.active
        });
        if (!newUser) return;
        addMessage(t('user-create-page.success-create'));
        router.push(routerLinkI18n({ name: 'UserTarget', params: { id: newUser.id } }));
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>

<style lang="scss">
#user-create-page {
    .theme-form-container {
        max-width: 600px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>
