<script lang="ts">
export default {
    name: 'VerifyEmailConfirmPage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

/**
 * Spends the one-time email-verification token.
 *
 * Public deliberately, like the password-reset confirm: the link arrives by email and the
 * visitor following it is not necessarily signed in — the token is the credential. A submit
 * button rather than an auto-fire on mount, so a mail scanner prefetching the URL cannot spend
 * the token before the human arrives.
 */
interface VerifyEmailConfirmForm {
    token?: string;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const { confirmEmailVerification } = useProfileStore();

const formElement = ref<HTMLFormElement>();

const { form, formErrors, showFormErrors, isSubmitting, handleSubmit } =
    useAppForm<VerifyEmailConfirmForm>(
        {
            token: typeof route.query.token === 'string' ? route.query.token : ''
        },
        z.object({
            token: z.string().min(1, { error: () => t('verify-email-confirm-page.token-required') })
        }),
        { formElement }
    );

/**
 * Spends the token; success lands on the profile (a live session shows the banner gone) or the
 * login when there is none.
 *
 * @returns A promise resolving once the confirmation settles, reported as a toast.
 */
const submitForm = () =>
    handleSubmit(() =>
        confirmEmailVerification(form.value.token ?? '')
            .then(() => {
                addMessage(t('verify-email-confirm-page.success'));
                return router.push(routerLinkI18n({ name: 'Home' }));
            })
            // Swallows `router.push`'s resolved value — a failed navigation is the router's own
            // `onError` to report, not this form's. Same note as the reset confirm.
            .then(() => undefined)
    ).catch((error) => notifyErrorMessages(addMessage, error));
</script>

<template>
    <LayoutDefault
        id="verify-email-confirm-page"
        :title="t('verify-email-confirm-page.page-title')"
    >
        <v-card class="mx-auto mt-10 w-full max-w-md p-8">
            <p class="mb-4 opacity-80">{{ t('verify-email-confirm-page.intro') }}</p>
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.token"
                    type="text"
                    data-test="verify-token"
                    :label="t('verify-email-confirm-page.label-token')"
                    :error-messages="showFormErrors ? (formErrors.token ?? []) : []"
                    class="mb-4"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    block
                    data-test="verify-submit"
                    :loading="isSubmitting"
                >
                    {{ t('verify-email-confirm-page.button-submit') }}
                </v-btn>
            </form>
        </v-card>
    </LayoutDefault>
</template>
