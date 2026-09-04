<script lang="ts">
export default {
    name: 'TwoFactorChallengePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The login flow's second step: submit a code (or a backup code) against the challenge
 * `Login.vue` opened. Public route — the challenge token IS the credential, not a session — so a
 * visitor who lands here with none (a reload, a bookmarked URL) is bounced back to `Login`.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import { usePostLoginRedirect } from '@/modules/account/composables/use-post-login-redirect.ts';
import { useExpiryCountdown } from '@/modules/account/composables/use-expiry-countdown.ts';
import { useSafeI18n } from '@/modules/account/composables/use-safe-i18n.ts';
import { methodLabel } from '@/modules/account/domain/two-factor.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';

const { t, te } = useSafeI18n();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const twoFactor = useTwoFactorStore();
const { challenge, delivery, secondsUntilResend, loading } = storeToRefs(twoFactor);
const { redirectAfterLogin } = usePostLoginRedirect();

/**
 * No live challenge to answer — a reload, a bookmarked URL, or the challenge was already spent.
 * Back to the start; there is nothing here to recover.
 */
onMounted(() => {
    if (!challenge.value) void router.replace(routerLinkI18n({ name: 'Login' }));
});

/**
 * Counts down the CHALLENGE itself, not a delivered code's own (shorter) expiry — the challenge
 * is what stops accepting a submission at all.
 */
const challengeExpiresAt = computed(() => challenge.value?.expiresAt);
const { secondsLeft: secondsUntilChallengeExpires } = useExpiryCountdown(challengeExpiresAt);

/**
 * Which armed method is currently offered. Starts at the challenge's `defaultMethod` — the
 * cheapest one for the visitor — falling back to the first armed method.
 */
const selectedMethod = ref<string>();
onMounted(() => {
    selectedMethod.value = challenge.value?.defaultMethod ?? challenge.value?.methods[0]?.method;
});

/**
 * The method currently selected, resolved against the challenge's own list.
 */
const activeMethod = computed(() =>
    challenge.value?.methods.find((entry) => entry.method === selectedMethod.value)
);

/**
 * Whether a backup code is being entered instead of the armed method's own code — a UI mode, not
 * a different field: the server tells the two apart from the code's own shape.
 */
const usingBackupCode = ref(false);

const code = ref('');

/**
 * Sends a fresh code through the selected delivered method.
 *
 * @returns Nothing; the outcome is reported as a toast, and the resend cooldown starts.
 */
const handleSend = () => {
    if (!selectedMethod.value) return;
    return twoFactor
        .sendLoginCode(selectedMethod.value)
        .then(() => addMessage(t('two-factor.code-sent')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Submits the code against the live challenge; on success, hands off to the same redirect a plain
 * login takes.
 *
 * @returns Nothing; a wrong or expired code is reported as a toast rather than a field error —
 *  there is no form field the server names one against.
 */
const handleSubmit = () =>
    twoFactor
        .submitLoginCode(code.value)
        .then(() => redirectAfterLogin())
        .then(() => undefined)
        .catch((error) => notifyErrorMessages(addMessage, error));

onUnmounted(() => {
    // A spent or abandoned challenge must not survive to the next visit to this route.
    if (!challenge.value) return;
    twoFactor.clearChallenge();
});
</script>

<template>
    <LayoutDefault
        v-if="challenge"
        id="two-factor-challenge-page"
        :title="t('two-factor-challenge-page.page-title')"
    >
        <v-card class="mx-auto mt-16 w-full max-w-md p-8">
            <p class="mb-4 opacity-80">{{ t('two-factor-challenge-page.intro') }}</p>

            <v-select
                v-if="challenge.methods.length > 1"
                v-model="selectedMethod"
                :items="
                    challenge.methods.map((entry) => ({
                        value: entry.method,
                        title: methodLabel(t, te, entry.method)
                    }))
                "
                :label="t('two-factor-challenge-page.label-method')"
                class="mb-2"
            />

            <template v-if="activeMethod?.delivers">
                <v-btn
                    variant="tonal"
                    block
                    class="mb-4"
                    :disabled="secondsUntilResend > 0"
                    :loading="loading"
                    data-test="two-factor-challenge-send"
                    @click="handleSend"
                >
                    {{
                        secondsUntilResend > 0
                            ? t('two-factor-challenge-page.button-resend-in', {
                                  seconds: secondsUntilResend
                              })
                            : t('two-factor-challenge-page.button-send')
                    }}
                </v-btn>
                <!-- Announces the delivery so a screen-reader user learns a code was sent without
                     having to discover the toast. -->
                <p v-if="delivery" role="status" class="mb-4 text-sm opacity-80">
                    {{ t('two-factor.sent-to', { target: delivery.sentTo }) }}
                </p>
            </template>

            <form novalidate @submit.prevent="handleSubmit">
                <v-text-field
                    v-model="code"
                    autocomplete="one-time-code"
                    :inputmode="usingBackupCode ? 'text' : 'numeric'"
                    :label="
                        usingBackupCode
                            ? t('two-factor-challenge-page.label-backup-code')
                            : t('two-factor-challenge-page.label-code')
                    "
                    class="mb-2"
                    data-test="two-factor-challenge-code"
                />

                <!-- Live region: the challenge's own countdown, distinct from the resend cooldown
                     above. Announces politely rather than interrupting typing. -->
                <p role="status" class="mb-4 text-sm opacity-70">
                    {{
                        secondsUntilChallengeExpires > 0
                            ? t('two-factor-challenge-page.expires-in', {
                                  seconds: secondsUntilChallengeExpires
                              })
                            : t('two-factor-challenge-page.expired')
                    }}
                </p>

                <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :disabled="secondsUntilChallengeExpires <= 0"
                    :loading="loading"
                    data-test="two-factor-challenge-submit"
                >
                    {{ t('two-factor-challenge-page.button-submit') }}
                </v-btn>
            </form>

            <div class="mt-4 flex justify-center">
                <v-btn
                    variant="text"
                    data-test="two-factor-challenge-use-backup-code"
                    @click="usingBackupCode = !usingBackupCode"
                >
                    {{
                        usingBackupCode
                            ? t('two-factor-challenge-page.link-use-code')
                            : t('two-factor-challenge-page.link-use-backup-code')
                    }}
                </v-btn>
            </div>
        </v-card>
    </LayoutDefault>
</template>
