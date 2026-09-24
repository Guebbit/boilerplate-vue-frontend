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
import { onUnmounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { getRetryAfter } from '@/infrastructure/http/envelope.ts';

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
 * unlike the account module's full record, which only the profile page fetches. `can` is a
 * method, not state, so it comes off the store directly rather than through `storeToRefs`.
 */
const sessionStore = useSessionStore();
const { viewer } = storeToRefs(sessionStore);
const { can } = sessionStore;

/**
 * Re-sends the address-verification email. Reaches into the account module the way
 * `ReauthDialog` reaches for `useAuthStore()`: the shell renders it, the module owns the call.
 */
const { requestEmailVerification } = useProfileStore();

/**
 * Seconds left on the server's own resend cooldown, counted down to re-enable the button. Zero
 * means it may be pressed.
 */
const cooldown = ref(0);

/**
 * The interval driving `cooldown`, kept so it can be cleared — on reaching zero, and on unmount,
 * since a banner that rides every page outlives any one of them.
 */
let ticker: ReturnType<typeof setInterval> | undefined;

/**
 * Starts the countdown the server just handed back.
 *
 * @param seconds - the cooldown from `resendAfter`; 0 or less leaves the button enabled
 */
const startCooldown = (seconds: number) => {
    if (seconds <= 0) return;
    cooldown.value = seconds;
    clearInterval(ticker);
    ticker = setInterval(() => {
        cooldown.value -= 1;
        if (cooldown.value <= 0) clearInterval(ticker);
    }, 1000);
};

onUnmounted(() => {
    clearInterval(ticker);
});

/**
 * Re-sends the verification email — the banner's one action.
 *
 * The cooldown comes from the response, never from a number chosen here: the endpoint answers 429
 * inside its own window, so a client that invents its own would eventually disagree with it.
 *
 * @returns Nothing; a toast reports the send (or the 409 for an already verified account).
 */
const handleResendVerification = () => {
    requestEmailVerification()
        .then((resendAfter) => {
            startCooldown(resendAfter);
            addMessage(t('verification-banner.sent'));
        })
        .catch((error) => {
            // Signup already sent the first link, so the first press can land inside the
            // server's cooldown: count down ITS number rather than leave the button pressable.
            startCooldown(getRetryAfter(error, 'EMAIL_VERIFY_RESEND_TOO_SOON') ?? 0);
            notifyErrorMessages(addMessage, error);
        });
};
</script>

<template>
    <v-alert
        v-if="viewer && !can('checkout', 'Cart')"
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
                :disabled="cooldown > 0"
                @click="handleResendVerification"
            >
                {{
                    cooldown > 0
                        ? t('verification-banner.button-resend-wait', { seconds: cooldown })
                        : t('verification-banner.button-resend')
                }}
            </v-btn>
        </template>
    </v-alert>
</template>
