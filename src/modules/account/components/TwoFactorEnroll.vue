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
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import QRCode from 'qrcode';
import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import { useExpiryCountdown } from '@/modules/account/composables/use-expiry-countdown.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useNotificationsStore } from '@guebbit/vue-toolkit';

const { method } = defineProps<{
    /**
     * Wire name of the method being enrolled.
     */
    method: string;
}>();

/**
 * Fires once enrollment either armed the method or was abandoned — the parent closes the dialog
 * either way; success is told apart by `useTwoFactorStore().confirmed` still holding a value.
 */
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const twoFactor = useTwoFactorStore();
const { setup, delivery, secondsUntilResend } = storeToRefs(twoFactor);

/**
 * Closes the dialog, dropping any pending enrollment first — a delivered method's `setupMethod`
 * starts the resend countdown's `setInterval`, and nothing else stops it: `confirmMethod`'s own
 * success path already clears it, but cancelling, or the mount call itself failing, would
 * otherwise leave that interval ticking in the store for the rest of the session.
 */
const closeAndClear = () => {
    twoFactor.clearSetup();
    emit('close');
};

onMounted(() => {
    void twoFactor.setupMethod(method).catch((error) => {
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

const setupExpiresAt = computed(() => setup.value?.expiresAt);
const { secondsLeft: secondsUntilSetupExpires } = useExpiryCountdown(setupExpiresAt);

const code = ref('');

/**
 * Own loading flags for resend and confirm — the store's `loading` is one flag shared by every
 * 2FA call, and binding both buttons to it made confirming look like it was also resending
 * (and vice versa).
 */
const resending = ref(false);
const confirming = ref(false);

/**
 * Re-sends a delivered method's code — calling `setup` again, exactly as the initial send did;
 * the contract makes no distinction between "send" and "resend" for enrollment.
 */
const handleResend = () => {
    resending.value = true;
    return twoFactor
        .setupMethod(method)
        .catch((error) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            resending.value = false;
        });
};

/**
 * Proves the code and arms the method.
 *
 * @returns Nothing; on success the parent's watcher on `confirmed` takes over (the backup-codes
 *  screen, when this was the first factor). A wrong code is reported as a toast — there is no
 *  form field to attach it to.
 */
const handleConfirm = () => {
    confirming.value = true;
    return twoFactor
        .confirmMethod(method, code.value)
        .then(() => emit('close'))
        .catch((error) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            confirming.value = false;
        });
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
                <p v-if="setup.secret" class="mb-4 break-all text-sm opacity-80">
                    {{ t('two-factor.setup-totp-manual-entry', { secret: setup.secret }) }}
                </p>
            </template>

            <template v-else-if="setup?.delivers === true">
                <p class="mb-2">
                    {{ t('two-factor.setup-email-intro', { target: setup.sentTo }) }}
                </p>
                <p v-if="delivery" role="status" class="mb-2 text-sm opacity-70">
                    {{
                        secondsUntilSetupExpires > 0
                            ? t('two-factor-challenge-page.expires-in', {
                                  seconds: secondsUntilSetupExpires
                              })
                            : t('two-factor-challenge-page.expired')
                    }}
                </p>
                <v-btn
                    variant="text"
                    size="small"
                    class="mb-4"
                    :disabled="secondsUntilResend > 0"
                    :loading="resending"
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
                />
            </form>
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
                :loading="confirming"
                data-test="two-factor-enroll-confirm"
                @click="handleConfirm"
            >
                {{ t('two-factor.button-confirm') }}
            </v-btn>
        </v-card-actions>
    </v-card>
</template>
