<template>
    <LayoutDefault id="profile-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('profile-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
                <!-- TODO language select + roles (user edit, if admin) -->
                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && formErrors.username
                    }"
                >
                    <label for="username">{{ t('profile-page.label-username') }}</label>
                    <input v-model="form.username" type="text" id="username" class="theme-input" />
                    <p v-if="showErrors && formErrors.username" class="form-error-message">
                        {{ formErrors.username.join(', ') }}
                    </p>
                </div>

                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && formErrors.email
                    }"
                >
                    <label for="email">{{ t('profile-page.label-email') }}</label>
                    <input v-model="form.email" type="email" id="email" class="theme-input" />
                    <p v-if="showErrors && formErrors.email" class="form-error-message">
                        {{ formErrors.email.join(', ') }}
                    </p>
                </div>

                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && formErrors.phone
                    }"
                >
                    <label for="phone">{{ t('profile-page.label-phone') }}</label>
                    <input v-model="form.phone" type="tel" id="phone" class="theme-input" />
                </div>

                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && formErrors.website
                    }"
                >
                    <label for="website">{{ t('profile-page.label-website') }}</label>
                    <input v-model="form.website" type="url" id="website" class="theme-input" />
                </div>

                <br />

                <button
                    class="theme-button"
                    type="button"
                    @click="showChangePassword = !showChangePassword"
                >
                    {{ t('profile-page.button-change-password') }}
                </button>

                <div
                    v-show="showChangePassword"
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && (passwordErrors.password || passwordErrors.passwordConfirm)
                    }"
                >
                    <label for="password">{{ t('profile-page.label-password') }}</label>
                    <input
                        v-model="passwordForm.password"
                        type="password"
                        id="password"
                        class="theme-input"
                    />

                    <p
                        v-for="error in passwordErrors.password"
                        :key="'password-error-' + error"
                        class="form-error-message"
                    >
                        {{ error }}
                    </p>

                    <label for="passwordConfirm">{{
                        t('profile-page.label-passwordConfirm')
                    }}</label>
                    <input
                        v-model="passwordForm.passwordConfirm"
                        type="password"
                        id="passwordConfirm"
                        class="theme-input"
                    />
                    <p v-if="passwordErrors.passwordConfirm" class="form-error-message">
                        {{ passwordErrors.passwordConfirm.join(', ') }}
                    </p>

                    <br />
                </div>

                <!-- If something has changed OR the password has changed (and it's valid) -->
                <button type="submit" class="theme-button" :disabled="!areFormsValid">
                    {{ t('profile-page.button-submit') }}
                </button>
                <button type="button" class="theme-button" @click="reset">
                    {{ t('profile-page.reset-form') }}
                </button>
            </form>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProfilePage'
};
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormManagement } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { useUsersStore } from '@/stores/users.ts';
import type { User } from '@/api';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { z } from 'zod';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Profile logic
 */
const { updateProfile } = useProfileStore();
const { profile } = storeToRefs(useProfileStore());

/**
 * Form logic
 */
const { zodSchemaUsers, zodSchemaUsersPassword } = useUsersStore();

interface IProfileForm {
    id?: string | null;
    email?: string;
    username?: string;
    imageUrl?: string | null;
    admin?: boolean | null;
    active?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    phone?: string;
    website?: string;
}

const { form, formErrors, validate, setForm, resetForm } = useStructureFormManagement<IProfileForm>(
    {},
    zodSchemaUsers.partial()
);

/**
 * Another instance of form only for the password
 */
const {
    form: passwordForm,
    formErrors: passwordErrors,
    isValid: passwordIsValid
} = useStructureFormManagement<{ password: string; passwordConfirm: string }>(
    {
        password: '',
        passwordConfirm: ''
    },
    z
        .object({
            password: zodSchemaUsersPassword,
            passwordConfirm: z.string().min(1, t('users-form.password-confirm-required'))
        })
        .superRefine(({ passwordConfirm, password }, ctx) => {
            if (passwordConfirm !== password)
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('users-form.password-dont-match'),
                    path: ['passwordConfirm']
                });
        })
);

/**
 * Populate form with profile data whenever it becomes available
 */
watch(
    profile,
    (newProfile) => {
        if (newProfile) setForm(newProfile);
    },
    { immediate: true }
);

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);

/**
 * Toggle password change
 * (I'll add a password change form + schemas)
 *
 * If password change is active, all password errors will be shown instantly
 */
const showChangePassword = ref(false);

/**
 * If both data and password forms are valid
 */
const areFormsValid = computed(
    () =>
        (JSON.stringify(form.value) !== JSON.stringify(profile.value ?? {}) &&
            !showChangePassword.value) ||
        (showChangePassword.value && passwordIsValid.value)
);

const reset = () => {
    resetForm();
    if (profile.value) setForm(profile.value);
};

/**
 *
 */
const submitForm = () => {
    if (!validate() || !areFormsValid.value) {
        showErrors.value = true;
        return;
    }
    const userData: Partial<User> = {
        id: form.value.id ?? undefined,
        email: form.value.email,
        username: form.value.username,
        imageUrl: form.value.imageUrl ?? undefined,
        admin: form.value.admin ?? undefined,
        active: form.value.active ?? undefined,
        createdAt: form.value.createdAt ?? undefined,
        updatedAt: form.value.updatedAt ?? undefined
    };
    return updateProfile(userData)
        .then(() => {
            addMessage(t('profile-page.success-update'));
        })
        .catch(({ message }) => {
            addMessage(message);
        });
};
</script>

<style lang="scss">
@use '@/assets/styles/components/forms';

#profile-page {
    .theme-form-container {
        max-width: 600px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>
