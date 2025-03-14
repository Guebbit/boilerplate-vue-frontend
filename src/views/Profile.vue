<template>
    <LayoutDefault id="profile-page">
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('profile-page.page-title') }}</span></h1>
        </template>

        <div class="theme-card theme-form-container">
            <form
                class="theme-form"
                @submit.prevent="submitForm"
            >
                <!-- TODO language select + roles (user edit, if admin) -->
                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && errors.username
                    }"
                >
                    <label for="username">{{ t('profile-page.label-username') }}</label>
                    <input v-model="form.username" type="text" id="username" class="theme-input" />
                    <p v-if="showErrors && errors.username" class="form-error-message">
                        {{ errors.username.join(', ') }}
                    </p>
                </div>

                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && errors.email
                    }"
                >
                    <label for="email">{{ t('profile-page.label-email') }}</label>
                    <input v-model="form.email" type="email" id="email" class="theme-input" />
                    <p v-if="showErrors && errors.email" class="form-error-message">
                        {{ errors.email.join(', ') }}
                    </p>
                </div>

                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && errors.phone
                    }"
                >
                    <label for="phone">{{ t('profile-page.label-phone') }}</label>
                    <input v-model="form.phone" type="tel" id="phone" class="theme-input" />
                </div>

                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && errors.conditions
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
                        'form-error': showErrors && (errors.password || errors.passwordConfirm)
                    }"
                >
                    <label for="password">{{ t('profile-page.label-password') }}</label>
                    <input
                        v-model="passwordForm.password"
                        type="password" id="password"
                        class="theme-input"
                    />

                    <p v-for="error in passwordErrors.password" class="form-error-message">
                        {{ error }}
                    </p>

                    <label for="passwordConfirm">{{ t('profile-page.label-passwordConfirm') }}</label>
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
                <button
                    type="submit"
                    class="theme-button"
                    :disabled="!areFormsValid"
                >
                    {{ t('profile-page.button-submit') }}
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

<script lang="ts">
export default {
    name: 'ProfilePage'
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toasts'
import { useStructureFormValidation } from '@/composables/structureFormValidation.ts'
import { useProfileStore } from '@/stores/profile.ts'
import { useUsersStore } from '@/stores/users.ts'

import LayoutDefault from '@/layouts/LayoutDefault.vue'
import { z } from 'zod'

const { t } = useI18n()
const { addMessage } = useToastStore()

/**
 * Profile logic
 */
const {
    updateProfile
} = useProfileStore()
const {
    profile
} = storeToRefs(useProfileStore())

/**
 * Form logic
 */
const {
    zodSchemaUsers,
    zodSchemaUsersPassword
} = useUsersStore()

const {
    form,
    errors,
    showErrors,
    hasChanged,
    reset,
    validate,
    setInitial
} = useStructureFormValidation(
    zodSchemaUsers,
    false
)

/**
 * Another instance of form only for the password
 */
const {
    form: passwordForm,
    errors: passwordErrors,
    isValid: passwordIsValid
} = useStructureFormValidation(
    z.object({
        password: zodSchemaUsersPassword,
        passwordConfirm: z.string({
            required_error: t('users-form.password-confirm-required')
        })
    })
        .superRefine(({ passwordConfirm, password }, ctx) => {
            if (passwordConfirm !== password)
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('users-form.password-dont-match'),
                    path: ['passwordConfirm']
                })
        })
)


/**
 * Profile information is the original
 */
setInitial(profile)

/**
 * Toggle password change
 * (I'll add a password change form + schemas)
 *
 * If password change is active, all password errors will be shown instantly
 */
const showChangePassword = ref(false)

/**
 * If both data and password forms are valid
 */
const areFormsValid = computed(() =>
    (hasChanged && !showChangePassword) ||
    (showChangePassword && passwordIsValid)
)

/**
 *
 */
const submitForm = () => {
    if (validate() && areFormsValid.value) {
        showErrors.value = true
        return
    }
    return updateProfile(form.value)
        .then(() => addMessage(t('profile-page.success-update')))
        .catch(({ message }) => addMessage(message))
}
</script>


<style lang="scss">
@use "@/assets/styles/components/forms";

#profile-page {
    .theme-form-container {
        max-width: 600px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>

