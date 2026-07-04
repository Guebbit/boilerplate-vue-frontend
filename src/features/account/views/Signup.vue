<template>
    <LayoutDefault id="signup-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('signup-page.page-title') }}</span>
            </h1>
        </template>

        <VCard class="mx-auto my-16 pa-6" max-width="480" elevation="2">
            <form ref="formElement" class="d-flex flex-column ga-4" @submit.prevent="submitForm">
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
                    v-model="form.conditions"
                    :label="t('signup-page.text-conditions')"
                    :errors="formErrors.conditions"
                    :show-errors="showErrors"
                />
                <BaseButton type="submit" :disabled="isSubmitting">
                    {{ t('signup-page.button-submit') }}
                </BaseButton>
            </form>
        </VCard>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'SignupPage'
};
</script>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { VCard } from 'vuetify/components';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { useRouter, useRoute } from 'vue-router';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { useUsersStore } from '@/features/users/store.ts';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseCheckbox from '@/components/atoms/BaseCheckbox.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { focusFirstErrorField } from '@/utils/forms.ts';

/*
 * UI logics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();
const route = useRoute();

/*
 * Form logics
 */
interface IUserSignupForm {
    email?: string;
    username?: string;
    password?: string;
    passwordConfirm?: string;
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

/*
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

const { signup, fetchProfile } = useProfileStore();

/*
 * Submit form and try to authenticate.
 * handleSubmit returns false when validation fails (shows errors),
 * and re-throws when the onSubmit handler itself throws (API errors caught below).
 */
const submitForm = () =>
    handleSubmit(async () => {
        const username = form.value.username?.trim();
        await signup(
            form.value.email!,
            form.value.password!,
            username || undefined,
            form.value.passwordConfirm!
        );
        await fetchProfile();
        await (route.query.continue
            ? router.push({ path: route.query.continue as string })
            : router.push({ name: 'Home' }));
        addMessage(t('signup-page.success-email-code-sent'));
    })
        .then(async (success) => {
            if (success) return;
            showErrors.value = true;
            addMessage(t('users-form.fix-errors'));
            await nextTick();
            focusFirstErrorField(formElement.value);
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>
