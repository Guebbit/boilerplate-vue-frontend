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
const router = useRouter();
const route = useRoute();

/**
 * Form logics
 */
interface IUserLoginForm {
    email?: string,
    password?: string,
}

const {
    zodUserSchema,
} = useUsersStore()

const {
    form,
    errors,
    showErrors,
    hasChanged,
    validate
} = useStructureFormValidation<IUserLoginForm>(
    zodUserSchema
        .pick({
            email: true,
        })
        .extend({
            password: z.string().min(8, t('users-form.password-required'))
        }),
    false
)
// TODO signup: costantvalidation ma errori mostrati solo quando il singolo campo è diverso dall'originale (non serve su focalize quindi tienilo per dopo)

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
        showErrors.value = true;
        return;
    }
    return login(form.value.email!, form.value.password!)
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
            if(errors.length === 0)
                addMessage(message)
            for (let i = 0, len = errors.length; i < len; i++)
                addMessage(errors[i])
        })
}
</script>

<template>
    <LayoutDefault id="login-page">
        <h1 class="theme-page-title">
            <span>{{ t('login-page.page-title') }}</span>
        </h1>

        <div class="theme-card form-container">
            <form @submit.prevent="submitForm">
                <div class="input-group">
                    <label for="form-email">{{ t('login-page.email-label') }}</label>
                    <input
                        v-model="form.email"
                        type="email"
                        id="form-email"
                        class="theme-input"
                    />
                    <p v-if="showErrors && errors.email" class="error">{{ errors.email.join(", ") }}</p>
                </div>
                <div class="input-group">
                    <label for="form-password">{{ t('login-page.password-label') }}</label>
                    <input
                        v-model="form.password"
                        type="password"
                        id="form-password"
                        class="theme-input"
                    />
                    <p v-if="showErrors && errors.password" class="error">{{ errors.password.join(", ") }}</p>
                </div>

                <button
                    type="submit"
                    class="theme-button"
                    :disabled="!hasChanged"
                >
                    {{ t('login-page.submit') }}
                </button>
            </form>
        </div>
    </LayoutDefault>
</template>

<style lang="scss">
#login-page{
    .form-container {
        max-width: 400px;
        margin: 100px auto;
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