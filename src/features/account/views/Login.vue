<template>
    <LayoutDefault id="login-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('login-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form ref="formElement" class="theme-form" @submit.prevent="submitForm">
                <BaseInput
                    v-model="form.email"
                    type="email"
                    :label="t('login-page.label-email')"
                    :errors="formErrors.email"
                    :show-errors="showErrors"
                />
                <BaseInput
                    v-model="form.password"
                    type="password"
                    :label="t('login-page.label-password')"
                    :errors="formErrors.password"
                    :show-errors="showErrors"
                />
                <BaseCheckbox v-model="form.remember" :label="t('login-page.label-remember')" />
                <RouterLink
                    :to="
                        routerLinkI18n({
                            name: 'PasswordResetRequest'
                        })
                    "
                    class="login-page-password-reset-link"
                >
                    {{ t('login-page.link-password-reset') }}
                </RouterLink>
                <BaseButton type="submit">
                    {{ t('login-page.button-submit') }}
                </BaseButton>
            </form>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'LoginPage'
};
</script>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { useUsersStore } from '@/features/users/store.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { focusFirstErrorField } from '@/utils/forms.ts';
import { routerLinkI18n } from '@/utils/i18n.ts';
import type { LoginRequest } from '@api';

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
const { zodSchemaUsers } = useUsersStore();

const { form, formErrors, validate } = useStructureFormValidation<
    LoginRequest & {
        remember?: boolean;
    }
>(
    {
        email: '',
        password: '',
        remember: false
    },
    zodSchemaUsers
        .pick({
            email: true
        })
        .extend({
            password: z.string().min(8, t('users-form.password-required'))
        })
);

const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

/**
 * If not in production, dummy user of local database
 */
if (import.meta.env.NODE_ENV !== 'production')
    form.value = {
        email: 'root@root.it',
        password: 'rootroot'
    };

/**
 * Submit form and try to authenticate
 */
const submitForm = async () => {
    const { login } = useProfileStore();
    if (!validate()) {
        showErrors.value = true;
        addMessage(t('users-form.fix-errors'));
        await nextTick();
        focusFirstErrorField(formElement.value);
        return;
    }
    return login(form.value.email!, form.value.password!)
        .then(() =>
            // if query continue was set, redirect to that page, otherwise redirect to home
            route.query.continue
                ? router.push({ path: route.query.continue as string })
                : router.push({ name: 'Home' })
        )
        .catch((error) => notifyErrorMessages(addMessage, error));
};
</script>

<style lang="scss">
#login-page {
    .theme-form-container {
        max-width: 400px;
        margin: 100px auto;
        padding: 2rem;
    }

    .login-page-password-reset-link {
        display: inline-flex;
        margin-bottom: 1rem;
    }
}
</style>
