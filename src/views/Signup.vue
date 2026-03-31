<template>
    <LayoutDefault id="signup-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('signup-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && formErrors.email
                    }"
                >
                    <label for="form-email">{{ t('signup-page.label-email') }}</label>
                    <input v-model="form.email" type="email" id="form-email" class="theme-input" />
                    <p v-if="showErrors && formErrors.email" class="form-error-message">
                        {{ formErrors.email.join(', ') }}
                    </p>
                </div>
                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && formErrors.password
                    }"
                >
                    <label for="form-password">{{ t('signup-page.label-password') }}</label>
                    <input
                        v-model="form.password"
                        type="password"
                        id="form-password"
                        class="theme-input"
                    />
                    <p v-if="showErrors && formErrors.password" class="form-error-message">
                        {{ formErrors.password.join(', ') }}
                    </p>
                </div>

                <div class="theme-form-input-checkbox">
                    <input v-model="form.remember" type="checkbox" id="form-remember" />
                    <label for="form-remember">{{ t('signup-page.label-remember') }}</label>
                </div>

                <div
                    class="theme-form-input-checkbox"
                    :class="{
                        'form-error': showErrors && formErrors.conditions
                    }"
                >
                    <input v-model="form.conditions" type="checkbox" id="form-conditions" />
                    <label for="form-conditions">{{ t('signup-page.text-conditions') }}</label>
                </div>

                <button type="submit" class="theme-button" :disabled="!isDirty || isSubmitting">
                    {{ t('signup-page.button-submit') }}
                </button>
            </form>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'SignupPage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormManagement } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { useRouter, useRoute } from 'vue-router';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { useUsersStore } from '@/stores/users.ts';

/**
 * UI logics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();
const route = useRoute();

/**
 * Form logics
 */
interface IUserSignupForm {
    email?: string;
    password?: string;
    remember?: boolean;
    conditions?: boolean;
}

const { zodSchemaUsers } = useUsersStore();

const { form, formErrors, isDirty, isSubmitting, handleSubmit } =
    useStructureFormManagement<IUserSignupForm>(
        import.meta.env.NODE_ENV !== 'production'
            ? { email: 'root@root.it', password: 'RootRoot_123' }
            : {},
        zodSchemaUsers
            .pick({
                email: true
            })
            .extend({
                password: z.string().min(8, t('users-form.password-required')),
                conditions: z.boolean().refine((value) => value, {
                    message: t('users-form.conditions-required')
                })
            })
    );

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);

const { signup, fetchProfile } = useProfileStore();

/**
 * Submit form and try to authenticate.
 * handleSubmit returns false when validation fails (shows errors),
 * and re-throws when the onSubmit handler itself throws (API errors caught below).
 */
const submitForm = () =>
    handleSubmit(async () => {
        await signup(form.value.email!, form.value.password!);
        await fetchProfile();
        if (route.query.continue) {
            await router.push({ path: route.query.continue as string });
        } else {
            await router.push({ name: 'Home' });
        }
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch(({ message, errors = [] }) => {
            if (errors.length === 0) addMessage(message);
            for (let i = 0, len = errors.length; i < len; i++) addMessage(errors[i]);
        });
</script>

<style lang="scss">
@use '@/assets/styles/components/forms';

#signup-page {
    .theme-form-container {
        max-width: 400px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>
