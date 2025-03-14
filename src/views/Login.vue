<template>
    <LayoutDefault id="login-page">
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('login-page.page-title') }}</span></h1>
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
                    <label for="form-email">{{ t('login-page.label-email') }}</label>
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
                    <label for="form-password">{{ t('login-page.label-password') }}</label>
                    <input
                        v-model="form.password"
                        type="password"
                        id="form-password"
                        class="theme-input"
                    />
                    <p v-if="showErrors && errors.password" class="form-error-message">{{ errors.password.join(', ')
                        }}</p>
                </div>

                <div class="theme-form-input-checkbox">
                    <input
                        v-model="form.remember"
                        type="checkbox"
                        id="form-remember"
                    />
                    <label for="form-remember">{{ t('login-page.label-remember') }}</label>
                </div>

                <button
                    type="submit"
                    class="theme-button"
                >
                    {{ t('login-page.button-submit') }}
                </button>
            </form>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'LoginPage'
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
interface IUserLoginForm {
    email?: string,
    password?: string,
    remember?: boolean
}

const {
    zodSchemaUsers
} = useUsersStore()

const {
    form,
    errors,
    showErrors,
    validate
} = useStructureFormValidation<IUserLoginForm>(
    zodSchemaUsers
        .pick({
            email: true
        })
        .extend({
            password: z.string().min(8, t('users-form.password-required'))
        }),
    false
)

/**
 * If not in production, dummy user of local database
 */
if (process.env.NODE_ENV !== 'production')
    form.value = {
        email: 'root@root.it',
        password: 'RootRoot_123'
    }

const {
    login,
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
    return login(form.value.email!, form.value.password!, form.value.remember)
        .then(() =>
            // if query continue was set, redirect to that page,
            // otherwise redirect to home
            route.query.continue ?
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

#login-page {
    .theme-form-container {
        max-width: 400px;
        margin: 100px auto;
        padding: 2rem;
    }
}
</style>