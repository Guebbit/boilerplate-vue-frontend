<template>
    <LayoutDefault id="profile-page">
        <h1 class="theme-page-title">
            <span>{{ t('profile-page.page-title') }}</span>
        </h1>

        <div class="theme-card profile-container">
            <form @submit.prevent="submitProfileForm">
                <!-- TODO language select + roles (user edit, if admin) -->
                <div class="input-group">
                    <label for="username">{{ t('profile-page.username-label') }}</label>
                    <input v-model="form.username" type="text" id="username" class="theme-input" />
                    <p v-if="showErrors && errors.username" class="error">{{ errors.username.join(", ") }}</p>
                </div>

                <div class="input-group">
                    <label for="email">{{ t('profile-page.email-label') }}</label>
                    <input v-model="form.email" type="email" id="email" class="theme-input" />
                    <p v-if="showErrors && errors.email" class="error">{{ errors.email.join(", ") }}</p>
                </div>

                <div class="input-group">
                    <label for="phone">{{ t('profile-page.phone-label') }}</label>
                    <input v-model="form.phone" type="tel" id="phone" class="theme-input" />
                </div>

                <div class="input-group">
                    <label for="website">{{ t('profile-page.website-label') }}</label>
                    <input v-model="form.website" type="url" id="website" class="theme-input" />
                </div>

                <hr />

                <div class="input-group">
                    <label for="password">{{ t('profile-page.password-label') }}</label>
                    <input v-model="form.password" type="password" id="password" class="theme-input" />
                    <label for="passwordConfirm">{{ t('profile-page.passwordConfirm-label') }}</label>
                    <input v-model="form.passwordConfirm" type="password" id="passwordConfirm" class="theme-input" />
                    <p v-if="showErrors && errors.password" class="error">{{ errors.password.join(", ") }}</p>
                    <p v-if="showErrors && errors.passwordConfirm" class="error">{{ errors.passwordConfirm.join(", ") }}</p>
                </div>

                <button
                    type="submit"
                    class="theme-button"
                    :disabled="!hasChanged"
                >
                    {{ t('profile-page.submit') }}
                </button>
                <button
                    type="button"
                    class="theme-button"
                    @click="reset"
                >
                    {{ t('profile-page.reset-form') }}
                </button>
            </form>
        </div>
    </LayoutDefault>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toasts';
import { useStructureFormValidation } from '@/composables/structureFormValidation.ts';
import { useProfileStore } from '@/stores/profile.ts';
import { useUsersStore } from '@/stores/users.ts'

import LayoutDefault from '@/layouts/LayoutDefault.vue'

const { t } = useI18n();
const { addMessage } = useToastStore();

/**
 * Form logic
 */
const {
    zodSchemaUsers
} = useUsersStore()

const {
    form,
    initial,
    errors,
    showErrors,
    hasChanged,
    reset,
    validate,
    setInitial
} = useStructureFormValidation(
    zodSchemaUsers,
    false
);

const { updateProfile } = useProfileStore();

const submitProfileForm = () => {
    if (validate()) {
        showErrors.value = true;
        return;
    }
    return updateProfile(form.value)
        .then(() => addMessage(t('profile-page.Profile updated successfully')))
        .catch(({ message }) => addMessage(message));
};

/**
 * Profile logic
 */
const {
    profile
} = storeToRefs(useProfileStore())

/**
 * Profile information is the original
 */
setInitial(profile);
</script>

<style lang="scss">
#profile-page{
    .profile-container {
        max-width: 600px;
        margin: 50px auto;
        padding: 2rem;

        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
    }

    .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>
