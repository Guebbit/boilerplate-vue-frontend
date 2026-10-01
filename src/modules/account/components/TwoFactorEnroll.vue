<script lang="ts">
export default {
    name: 'TwoFactorEnroll'
};
</script>

<script setup lang="ts">
/**
 * @module
 * One method's enrollment: `setup` on mount, then `delivers` says which half to render — a QR
 * code plus manual-entry secret for a device method, a "code sent to…" plus resend for a
 * delivered one — and a code field either way. Method-agnostic throughout: nothing here branches
 * on which method string it was called with, only on `delivers`.
 *
 * Resend and confirm each block this card in place (`useBlockingError`, shared between the two —
 * both act on the same code field) instead of toasting, since neither closes the dialog on
 * failure. The initial `setup` on mount stays a toast: a failure there closes the dialog before
 * the card can show anything, so there is nowhere for an inline alert to stay put. See
 * docs/theory/request-flow.md.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import QRCode from 'qrcode';
import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import {
    useExpiryCountdown,
    useCountdownAnnouncement
} from '@/modules/account/composables/use-countdown.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import type { TwoFactorSetup } from '@api';

/**
 * Which second factor is being armed.
 */
const { method, initialSetup } = defineProps<{
    /**
     * Wire name of the method being enrolled.
     */
    method: string;

    /**
     * The setup answer the parent already holds, when it had to start the setup itself — the
     * code-proved case (a replace, or a second method), where a wrong code must stay in the prompt
     * that asked for it rather than close this dialog. Absent, this card starts the setup on mount.
     */
    initialSetup?: TwoFactorSetup;
}>();

/**
 * Fires once enrollment either armed the method or was abandoned — the parent closes the dialog
 * either way. On success, carries the one-time backup codes when this armed the FIRST factor
 * (`undefined` otherwise) — held here only long enough to hand off, never in the store, same
 * "never park a secret in a store" idiom as `api-keys`/`webhooks`.
 */
const emit = defineEmits<{ close: [backupCodes?: string[]] }>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The two-factor store, held whole: its actions and its `storeToRefs` slice are both read.
 */
const twoFactor = useTwoFactorStore();

/**
 * Enrolment state: the delivery target, the resend countdown, and a flag per in-flight call so
 * each button disables on its own.
 */
const { delivery, secondsUntilResend, sendingCode, confirmingCode } = storeToRefs(twoFactor);

/**
 * The pending setup for {@link method} — held here, not in the store: it carries the TOTP secret
 * and `otpauthUri` for a device method, shown once for this dialog's lifetime and never cached.
 */
const setup = ref<TwoFactorSetup>();

/**
 * Closes the dialog, dropping any pending enrollment first — a delivered method's `setupMethod`
 * starts the resend countdown's `setInterval`, and nothing else stops it: `confirmMethod`'s own
 * success path already clears it, but cancelling, or the mount call itself failing, would
 * otherwise leave that interval ticking in the store for the rest of the session.
 */
const closeAndClear = () => {
    emit('close');
    // Re-read the status too: a replace disarms the method before its new code is proved, so a
    // cancel would otherwise leave the panel listing a factor the server no longer holds.
    void twoFactor.abandonSetup();
};

onMounted(() => {
    if (initialSetup) {
        setup.value = initialSetup;
        return;
    }
    // Stays a toast: a failure here closes the dialog immediately (nothing to render without a
    // setup answer), so an inline alert would have nowhere to stay visible.
    void twoFactor
        .setupMethod(method)
        .then((payload) => {
            setup.value = payload;
        })
        .catch((error) => {
            notifyErrorMessages(addMessage, error);
            closeAndClear();
        });
});

/**
 * The device half's QR code, rendered from `setup.otpauthUri` — this app never receives an image,
 * since generating it server-side would put the secret on the wire twice.
 */
const qrCodeDataUrl = ref<string>();

watch(
    () => setup.value?.otpauthUri,
    (uri) => {
        qrCodeDataUrl.value = undefined;
        if (!uri) return;
        void QRCode.toDataURL(uri).then((dataUrl) => {
            qrCodeDataUrl.value = dataUrl;
        });
    },
    { immediate: true }
);

/**
 * How long the delivered code stays valid — the server's own `expiresAt`, counted down.
 */
const { secondsLeft: secondsUntilSetupExpires } = useExpiryCountdown(
    computed(() => setup.value?.expiresAt)
);

/**
 * The delivered code's OWN screen-reader announcement (FA82) — 60/30/10s and expired only, never
 * every tick. The visible ticking number beside it is not itself a live region.
 */
const { announcement: setupExpiryAnnouncement } = useCountdownAnnouncement(
    secondsUntilSetupExpires,
    (seconds) => t('two-factor.code-expires-in', { seconds }),
    () => t('two-factor.code-expired')
);

/**
 * The code being typed, proved by {@link handleConfirm}.
 */
const code = ref('');

/**
 * This card's own blocked state — resend and confirm share one instance, since both act on the
 * same code field and neither closes the dialog on failure.
 */
const { message: codeError, report: reportCodeError, clear: clearCodeError } = useBlockingError();

/**
 * Re-sends a delivered method's code — calling `setup` again, exactly as the initial send did;
 * the contract makes no distinction between "send" and "resend" for enrollment.
 */
const handleResend = () => {
    clearCodeError();
    return twoFactor
        .setupMethod(method)
        .then((payload) => {
            setup.value = payload;
        })
        .catch((error) => reportCodeError(error));
};

/**
 * Proves the code and arms the method.
 *
 * @returns Nothing; on success {@link emit} carries the fresh backup codes to the parent when this
 *  armed the FIRST factor (its own backup-codes screen takes over then), or nothing otherwise. A
 *  wrong code blocks this card in place ({@link codeError}) — there is no form field of its own to
 *  attach it to.
 */
const handleConfirm = () => {
    clearCodeError();
    return twoFactor
        .confirmMethod(method, code.value)
        .then((result) => emit('close', result?.backupCodes))
        .catch((error) => reportCodeError(error));
};
</script>

<template>
    <v-card data-test="two-factor-enroll">
        <v-card-title>{{ t('two-factor.button-add') }}</v-card-title>
        <v-card-text>
            <template v-if="setup?.delivers === false">
                <p class="mb-4">{{ t('two-factor.setup-totp-intro') }}</p>
                <img
                    v-if="qrCodeDataUrl"
                    :src="qrCodeDataUrl"
                    :alt="t('two-factor.setup-totp-qr-alt')"
                    class="mx-auto mb-4 h-40 w-40"
                />
                <p
                    v-if="setup.secret"
                    class="mb-4 break-all text-sm opacity-80"
                    data-test="two-factor-enroll-secret"
                >
                    {{ t('two-factor.setup-totp-manual-entry', { secret: setup.secret }) }}
                </p>
            </template>

            <template v-else-if="setup?.delivers === true">
                <p class="mb-2">
                    {{ t('two-factor.setup-email-intro', { target: setup.sentTo }) }}
                </p>
                <!-- Ticking countdown, NOT a live region — re-rendering `role="status"` every
                     second is what used to flood a screen reader with "59… 58… 57…" (FA82). The
                     paired live region right below speaks only at 60/30/10s and expired. -->
                <p v-if="delivery" class="mb-1 text-sm opacity-70">
                    {{
                        secondsUntilSetupExpires > 0
                            ? t('two-factor.code-expires-in', {
                                  seconds: secondsUntilSetupExpires
                              })
                            : t('two-factor.code-expired')
                    }}
                </p>
                <p v-if="delivery" role="status" class="sr-only mb-1">
                    {{ setupExpiryAnnouncement }}
                </p>
                <v-btn
                    variant="text"
                    size="small"
                    class="mb-4"
                    :disabled="secondsUntilResend > 0"
                    :loading="sendingCode"
                    data-test="two-factor-resend"
                    @click="handleResend"
                >
                    {{
                        secondsUntilResend > 0
                            ? t('two-factor.button-resend-in', { seconds: secondsUntilResend })
                            : t('two-factor.button-send')
                    }}
                </v-btn>
            </template>

            <form novalidate @submit.prevent="handleConfirm">
                <v-text-field
                    v-model="code"
                    autocomplete="one-time-code"
                    inputmode="numeric"
                    :label="t('two-factor.label-code')"
                    data-test="two-factor-enroll-code"
                    @update:model-value="clearCodeError"
                />
            </form>

            <InlineErrorAlert :message="codeError" data-test="two-factor-enroll-error" />
        </v-card-text>
        <v-card-actions>
            <v-spacer />
            <v-btn variant="text" data-test="two-factor-enroll-cancel" @click="closeAndClear">
                {{ t('two-factor.button-cancel') }}
            </v-btn>
            <v-btn
                color="primary"
                variant="flat"
                :disabled="!code"
                :loading="confirmingCode"
                data-test="two-factor-enroll-confirm"
                @click="handleConfirm"
            >
                {{ t('two-factor.button-confirm') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>
