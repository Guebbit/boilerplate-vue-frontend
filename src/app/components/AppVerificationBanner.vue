<script lang="ts">
export default {
    name: 'AppVerificationBanner'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The "please confirm your email" banner, mounted in the shell so it rides EVERY page: the
 * checkout refuses an unproved address (`EMAIL_NOT_VERIFIED`), and a warning a visitor only meets
 * at the till is a warning that arrived too late.
 */
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * Translator for the banner's own copy.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report the resend's outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The shell's projection of the signed-in visitor — the one thing hydrated on every page load,
 * unlike the account module's full record, which only the profile page fetches.
 */
const { viewer } = storeToRefs(useSessionStore());

/**
 * Re-sends the address-verification email. Reaches into the account module the way
 * `ReauthDialog` reaches for `useAuthStore()`: the shell renders it, the module owns the call.
 */
const { requestEmailVerification } = useProfileStore();

/**
 * Re-sends the verification email — the banner's one action.
 *
 * @returns Nothing; a toast reports the send (or the 409 for an already verified account).
 */
const handleResendVerification = () => {
    requestEmailVerification()
        .then(() => addMessage(t('verification-banner.sent')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};
</script>

<template>
    <v-alert
        v-if="viewer && !viewer.verified"
        type="warning"
        variant="tonal"
        density="compact"
        class="rounded-0"
        data-test="verify-banner"
    >
        {{ t('verification-banner.message') }}
        <template #append>
            <v-btn
                variant="text"
                size="small"
                data-test="verify-resend"
                @click="handleResendVerification"
            >
                {{ t('verification-banner.button-resend') }}
            </v-btn>
        </template>
    </v-alert>
</template>
