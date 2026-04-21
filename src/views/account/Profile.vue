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
                <BaseInput
                    v-model="form.username"
                    type="text"
                    :label="t('profile-page.label-username')"
                    :errors="formErrors.username"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.email"
                    type="email"
                    :label="t('profile-page.label-email')"
                    :errors="formErrors.email"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.phone"
                    type="tel"
                    :label="t('profile-page.label-phone')"
                    :errors="formErrors.phone"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.website"
                    type="url"
                    :label="t('profile-page.label-website')"
                    :errors="formErrors.website"
                    :show-errors="showErrors"
                />

                <BaseButton type="button" @click="showChangePassword = !showChangePassword">
                    {{ t('profile-page.button-change-password') }}
                </BaseButton>

                <template v-if="showChangePassword">
                    <BaseInput
                        v-model="passwordForm.password"
                        type="password"
                        :label="t('profile-page.label-password')"
                        :errors="passwordErrors.password"
                        :show-errors="true"
                    />
                    <BaseInput
                        v-model="passwordForm.passwordConfirm"
                        type="password"
                        :label="t('profile-page.label-passwordConfirm')"
                        :errors="passwordErrors.passwordConfirm"
                        :show-errors="true"
                    />
                </template>

                <!-- If something has changed OR the password has changed (and it's valid) -->
                <BaseButton type="submit" :disabled="!areFormsValid">
                    {{ t('profile-page.button-submit') }}
                </BaseButton>
                <BaseButton type="button" @click="resetForm">
                    {{ t('profile-page.reset-form') }}
                </BaseButton>
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
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { useUsersStore } from '@/stores/users.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { z } from 'zod';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

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

/**
 * Extended profile form interface to accommodate extra UI fields (phone, website)
 * that are not part of the core User schema but are displayed in the profile form.
 */
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

const { form, formErrors, isDirty, resetForm, validate, setForm } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useStructureFormValidation<IProfileForm>({}, zodSchemaUsers as any);

const showErrors = ref(false);

/**
 * Another instance of form only for the password
 */
const {
    form: passwordForm,
    formErrors: passwordErrors,
    isValid: passwordIsValid
} = useStructureFormValidation(
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
 * Profile information is the original
 */
watch(
    profile,
    (userProfile) => {
        setForm(userProfile ?? {});
    },
    { immediate: true }
);

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
        (isDirty.value && !showChangePassword.value) ||
        (showChangePassword.value && passwordIsValid.value)
);

/**
 * Submit profile changes, optionally including a password update
 */
const submitForm = () => {
    if (!validate() || !areFormsValid.value) {
        showErrors.value = true;
        return;
    }
    return updateProfile({
        email: form.value.email,
        username: form.value.username,
        imageUrl: form.value.imageUrl ?? undefined,
        admin: form.value.admin ?? undefined,
        active: form.value.active ?? undefined,
        createdAt: form.value.createdAt ?? undefined,
        updatedAt: form.value.updatedAt ?? undefined
    })
        .then(() => {
            addMessage(t('profile-page.success-update'));
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
};
</script>

<style lang="scss">
#profile-page {
    .theme-form-container {
        max-width: 600px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>
