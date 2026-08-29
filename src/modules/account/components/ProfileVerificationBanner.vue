<script lang="ts">
export default {
    name: 'ProfileVerificationBanner'
};
</script>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * The "please verify your email" banner and its resend button — shown whenever the loaded
 * profile is known to be unverified.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { requestEmailVerification } = useProfileStore();
const { profile } = storeToRefs(useProfileStore());

/**
 * Re-sends the verification email — the banner's one action.
 *
 * @returns Nothing; a toast reports the send (or the 409 for an already verified account).
 */
const handleResendVerification = () => {
    requestEmailVerification()
        .then(() => addMessage(t('profile-page.verify-email-sent')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};
</script>

<template>
    <v-alert
        v-if="profile && profile.verified === false"
        type="warning"
        variant="tonal"
        class="mx-auto mt-10 w-full max-w-xl"
        data-test="verify-banner"
    >
        {{ t('profile-page.verify-banner') }}
        <template #append>
            <v-btn
                variant="text"
                size="small"
                data-test="verify-resend"
                @click="handleResendVerification"
            >
                {{ t('profile-page.verify-resend') }}
            </v-btn>
        </template>
    </v-alert>
</template>
