<template>
    <LayoutDefault id="signup-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('signup-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
                <BaseInput
                    v-model="form.email"
                    type="email"
                    :label="t('signup-page.label-email')"
                    :errors="formErrors.email"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.password"
                    type="password"
                    :label="t('signup-page.label-password')"
                    :errors="formErrors.password"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.passwordConfirm"
                    type="password"
                    :label="t('users-form.label-passwordConfirm')"
                    :errors="formErrors.passwordConfirm"
                    :show-errors="showErrors"
                />
                <BaseCheckbox
                    v-model="form.remember"
                    :label="t('signup-page.label-remember')"
                />
                <BaseCheckbox
                    v-model="form.conditions"
                    :label="t('signup-page.text-conditions')"
                    :errors="formErrors.conditions"
                    :show-errors="showErrors"
                />
                <BaseButton type="submit" :disabled="isSubmitting">
                    {{ t('signup-page.button-submit') }}
                </BaseButton>
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
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { useRouter, useRoute } from 'vue-router';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { useUsersStore } from '@/stores/users.ts';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseCheckbox from '@/components/atoms/BaseCheckbox.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

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
    username?: string;
    password?: string;
    passwordConfirm?: string;
    remember?: boolean;
    conditions?: boolean;
}

const { zodSchemaUsers } = useUsersStore();

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IUserSignupForm>(
        {
            email: '',
            username: '',
            password: '',
            passwordConfirm: '',
            remember: false,
            conditions: false
        },
        zodSchemaUsers
            .pick({ email: true })
            .extend({
                password: z.string().min(8, t('users-form.password-required')),
                passwordConfirm: z.string().min(8, t('users-form.password-confirm-required')),
                conditions: z.boolean().refine((value) => value, {
                    message: t('users-form.conditions-required')
                })
            })
            .refine((data) => data.password === data.passwordConfirm, {
                message: t('users-form.password-dont-match'),
                path: ['passwordConfirm']
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
        await signup(
            form.value.email!,
            form.value.password!,
            form.value.username?.trim() || undefined,
            form.value.passwordConfirm!
        );
        await fetchProfile();
        await (route.query.continue
            ? router.push({ path: route.query.continue as string })
            : router.push({ name: 'Home' }));
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>

<style lang="scss">
#signup-page {
    .theme-form-container {
        max-width: 400px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>
