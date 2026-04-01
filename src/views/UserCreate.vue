<template>
    <LayoutDefault id="user-create-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('user-create-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
                <div
                    class="theme-form-input"
                    :class="{ 'form-error': showErrors && formErrors.email }"
                >
                    <label for="create-email">{{ t('user-create-page.label-email') }}</label>
                    <input
                        v-model="form.email"
                        type="email"
                        id="create-email"
                        class="theme-input"
                    />
                    <p v-if="showErrors && formErrors.email" class="form-error-message">
                        {{ formErrors.email.join(', ') }}
                    </p>
                </div>

                <div
                    class="theme-form-input"
                    :class="{ 'form-error': showErrors && formErrors.username }"
                >
                    <label for="create-username">{{ t('user-create-page.label-username') }}</label>
                    <input
                        v-model="form.username"
                        type="text"
                        id="create-username"
                        class="theme-input"
                    />
                    <p v-if="showErrors && formErrors.username" class="form-error-message">
                        {{ formErrors.username.join(', ') }}
                    </p>
                </div>

                <div
                    class="theme-form-input"
                    :class="{ 'form-error': showErrors && formErrors.password }"
                >
                    <label for="create-password">{{ t('user-create-page.label-password') }}</label>
                    <input
                        v-model="form.password"
                        type="password"
                        id="create-password"
                        class="theme-input"
                    />
                    <p v-if="showErrors && formErrors.password" class="form-error-message">
                        {{ formErrors.password.join(', ') }}
                    </p>
                </div>

                <div class="theme-form-input-checkbox">
                    <input v-model="form.admin" type="checkbox" id="create-admin" />
                    <label for="create-admin">{{ t('user-create-page.label-admin') }}</label>
                </div>

                <div class="theme-form-input-checkbox">
                    <input v-model="form.active" type="checkbox" id="create-active" />
                    <label for="create-active">{{ t('user-create-page.label-active') }}</label>
                </div>

                <br />

                <button type="submit" class="theme-button" :disabled="isSubmitting">
                    {{ t('user-create-page.button-submit') }}
                </button>
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
        zodSchemaUsers
            .pick({ email: true, username: true })
            .extend({
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
        addMessage(t('user-create-page.success-create'));
        router.push(routerLinkI18n({ name: 'UserTarget', params: { id: newUser.id } }));
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch(({ message }: { message: string }) => addMessage(message));
</script>

<style lang="scss">
@use '@/assets/styles/components/forms';

#user-create-page {
    .theme-form-container {
        max-width: 600px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>
