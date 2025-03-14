<template>
    <LayoutDefault id="signup-page">
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('signup-page.page-title') }}</span></h1>
        </template>

        <div class="theme-card theme-form-container">
            <form
                class="theme-form"
                @submit.prevent="submitForm"
            >
                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && errors.email
                    }"
                >
                    <label for="form-email">{{ t('signup-page.label-email') }}</label>
                    <input
                        v-model="form.email"
                        type="email"
                        id="form-email"
                        class="theme-input"
                    />
                    <p v-if="showErrors && errors.email" class="form-error-message">{{ errors.email.join(', ') }}</p>
                </div>
                <div
                    class="theme-form-input"
                    :class="{
                        'form-error': showErrors && errors.password
                    }"
                >
                    <label for="form-password">{{ t('signup-page.label-password') }}</label>
                    <input
                        v-model="form.password"
                        type="password"
                        id="form-password"
                        class="theme-input"
                    />
                    <p v-if="showErrors && errors.password" class="form-error-message">{{ errors.password.join(', ')  }}</p>
                </div>

                <div class="theme-form-input-checkbox">
                    <input
                        v-model="form.remember"
                        type="checkbox"
                        id="form-remember"
                    />
                    <label for="form-remember">{{ t('signup-page.label-remember') }}</label>
                </div>

                <div
                    class="theme-form-input-checkbox"
                    :class="{
                        'form-error': showErrors && errors.conditions
                    }"
                >
                    <input
                        v-model="form.conditions"
                        type="checkbox"
                        id="form-conditions"
                    />
                    <label for="form-conditions">{{ t('signup-page.text-conditions') }}</label>
                </div>

                <button
                    type="submit"
                    class="theme-button"
                    :disabled="!hasChanged"
                >
                    {{ t('signup-page.button-submit') }}
                </button>
            </form>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'SignupPage'
}
</script>

<script setup lang="ts">
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '@/stores/toasts'
import { useStructureFormValidation } from '@/composables/structureFormValidation.ts'
import { useProfileStore } from '@/stores/profile.ts'
import { useRouter, useRoute } from 'vue-router'
import LayoutDefault from '@/layouts/LayoutDefault.vue'
import { useUsersStore } from '@/stores/users.ts'

/**
 * UI logics
 */
const { t } = useI18n()
const { addMessage } = useToastStore()
const router = useRouter()
const route = useRoute()

/**
 * Form logics
 */
interface IUserSignupForm {
    email?: string,
    password?: string,
    remember?: boolean,
    conditions?: boolean
}

const {
    zodSchemaUsers
} = useUsersStore()

// TODO signup: costantvalidation ma errori mostrati solo quando il singolo campo è diverso dall'originale
const {
    form,
    errors,
    showErrors,
    hasChanged,
    validate
} = useStructureFormValidation<IUserSignupForm>(
    zodSchemaUsers
        .pick({
            email: true
        })
        .extend({
            password: z.string().min(8, t('users-form.password-required')),
            conditions: z.boolean().refine(value => value === true, { message: t('users-form.conditions-required') })
        }),
    false
)


form.value = {
    email: 'root@root.it',
    password: 'RootRoot_123'
}

const {
    signup,
    fetchProfile
} = useProfileStore()

/**
 * Submit form and try to authenticate
 */
const submitForm = () => {
    if (!validate()) {
        showErrors.value = true
        return
    }
    return signup(form.value.email!, form.value.password!)
        .then(() => fetchProfile())
        .then(() => route.query.continue ?
            router.push({
                path: route.query.continue as string
            }) :
            router.push({
                name: 'Home'
            })
        )
        .catch(({ message, errors = [] }) => {
            if (errors.length === 0)
                addMessage(message)
            for (let i = 0, len = errors.length; i < len; i++)
                addMessage(errors[i])
        })
}
</script>

<style lang="scss">
@use "@/assets/styles/components/forms";

#signup-page {
    .theme-form-container {
        max-width: 400px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>