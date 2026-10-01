<script setup lang="ts">
/**
 * @module
 * Step-up re-authentication prompt: mounted once by `LayoutDefault.vue`, beside `<DialogHost />`.
 * Asks the server which method this account can use, then shows that one: a password field, or —
 * for an account with no password — a "send code" button and a field for the mailed code. On
 * submit it calls `useSessionStore().reauth()` itself — the interceptor that opened it only needed
 * to know when a fresh session exists, not how one gets there — and a wrong answer stays open for
 * another try rather than closing. See docs/modules/account.md.
 */
import { computed, nextTick, onUnmounted, ref, useId, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';
import type { VTextField } from 'vuetify/components';
import { useReauthPromptStore } from '@/infrastructure/http/reauth-prompt.ts';
import { reauthSendRetryAfter, useSessionStore } from '@/infrastructure/session.ts';
import { absentIs, getErrorMessage } from '@/infrastructure/utils/errors.ts';
import type { ReauthMethod, ReauthRequest } from '@types';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The prompt queue this dialog renders and answers.
 */
const reauthDialog = useReauthPromptStore();

/**
 * Whether a re-authentication call is in flight.
 */
const { reauthing } = storeToRefs(useSessionStore());

/**
 * Whether the dialog fills the screen — it does on a phone, see `useFullscreenDialog`.
 */
const fullscreen = useFullscreenDialog();

/**
 * Ids wiring the dialog's own title and body to `aria-labelledby` / `aria-describedby`.
 */
const titleId = useId();

/**
 * Id of the body copy, referenced by the dialog's `aria-describedby`.
 */
const messageId = useId();

/**
 * The password field. Cleared every time the prompt opens — never carried over from a previous,
 * unrelated step-up.
 */
const password = ref('');

/**
 * The last attempt's message, shown inline; `undefined` once the field is edited again.
 */
const errorMessage = ref<string>();

/**
 * The password input, focused by hand rather than the `autofocus` attribute — a11y lint forbids
 * it, since a plain HTML autofocus fires on first paint even for a dialog that opens later.
 */
const passwordField = ref<VTextField>();

/**
 * The mailed-code input, focused once a code has been requested.
 */
const codeField = ref<VTextField>();

/**
 * The code typed from the mail. Cleared with the prompt, like {@link password}.
 */
const code = ref('');

/**
 * What this account can answer with, in the server's order; `undefined` while it is being asked.
 */
const methods = ref<ReauthMethod[]>();

/**
 * The method on show: the first the server listed. The list is ordered for the visitor, so the
 * first is the one to offer.
 */
const method = computed(() => methods.value?.[0]);

/**
 * Whether the server has answered and offered nothing — an account with no password on a
 * deployment that cannot mail. A dead end told as one, not a form nobody can pass.
 */
const noMethod = computed(() => methods.value?.length === 0);

/**
 * Whether a code has been requested in this prompt, which swaps the hint under the button.
 */
const sent = ref(false);

/**
 * Seconds left on the server's resend cooldown; zero means "send code" may be pressed.
 */
const cooldown = ref(0);

/**
 * The interval driving {@link cooldown}, kept to be cleared at zero, on reopening and on unmount.
 */
let ticker: ReturnType<typeof setInterval> | undefined;

/**
 * Starts the countdown the server just handed back.
 *
 * @param seconds - The cooldown from `resendAfter` or a 429's `retryAfter`; zero or less is none.
 */
const startCooldown = (seconds: number) => {
    clearInterval(ticker);
    cooldown.value = Math.max(0, seconds);
    if (seconds <= 0) return;
    ticker = setInterval(() => {
        cooldown.value -= 1;
        if (cooldown.value <= 0) clearInterval(ticker);
    }, 1000);
};

onUnmounted(() => {
    clearInterval(ticker);
});

/**
 * Asks the server which method applies and focuses the field it brings.
 *
 * @returns A promise settling once the list is known; a failure shows in the dialog.
 */
const loadMethods = () =>
    useSessionStore()
        .reauthMethods()
        .then((list) => {
            methods.value = list;
            if (list[0] === 'password') void nextTick(() => passwordField.value?.focus());
        })
        .catch((error: unknown) => {
            methods.value = undefined;
            errorMessage.value = getErrorMessage(error);
        });

watch(
    () => reauthDialog.isOpen,
    (open) => {
        if (!open) return;
        password.value = '';
        code.value = '';
        sent.value = false;
        methods.value = undefined;
        errorMessage.value = undefined;
        startCooldown(0);
        void loadMethods();
    },
    // Also on mount: the dialog may be created while a prompt is already open.
    { immediate: true }
);

/**
 * Whether the dialog is showing. Closing it any way other than a successful submit — Escape, the
 * scrim, the cancel button — rejects the interceptor's parked requests: there is no "try later"
 * for a request that already needs a fresh session to succeed.
 */
const isOpen = computed({
    get: () => reauthDialog.isOpen,
    set: (open) => {
        if (!open) reauthDialog.rejectStepUp(new Error('REAUTH_CANCELLED'));
    }
});

/**
 * Hands focus back to the control that opened the re-authentication prompt once it closes.
 */
useReturnFocus(() => isOpen.value);

/**
 * The tagged body for whichever method is on show; `undefined` while its field is empty.
 */
const proof = computed<ReauthRequest | undefined>(() => {
    if (method.value === 'password' && password.value)
        return { method: 'password', password: password.value };
    if (method.value === 'email' && code.value) return { method: 'email', code: code.value };
    return undefined;
});

/**
 * Proves the answer and, on success, tells the interceptor a fresh session exists.
 *
 * @returns A promise resolving once the attempt settles. The prompt stays open either way, since
 *  the parked requests are still worth retrying once the visitor can — but a wrong answer (422)
 *  and any other failure (network, 5xx) are told apart: retyping the same thing again is never
 *  the right next step for a failure the answer had nothing to do with.
 */
const submit = () => {
    if (!proof.value) return;
    const wrongKey =
        proof.value.method === 'password'
            ? 'reauth-dialog.error-wrong-password'
            : 'reauth-dialog.error-wrong-code';
    return useSessionStore()
        .reauth(proof.value)
        .then(() => {
            reauthDialog.resolveStepUp();
        })
        .catch((error: unknown) => {
            errorMessage.value = absentIs(error, 422) ? t(wrongKey) : getErrorMessage(error);
            password.value = '';
            code.value = '';
        });
};

/**
 * Asks for the mailed code and starts the server's own resend countdown.
 *
 * @returns A promise settling once the send is answered. A 429 inside the cooldown starts the
 *  countdown from ITS number, so the button cannot be hammered while the server is refusing it.
 */
const sendCode = () => {
    errorMessage.value = undefined;
    return useSessionStore()
        .sendReauthCode()
        .then((resendAfter) => {
            startCooldown(resendAfter);
            sent.value = true;
            void nextTick(() => codeField.value?.focus());
        })
        .catch((error: unknown) => {
            startCooldown(reauthSendRetryAfter(error) ?? 0);
            errorMessage.value = getErrorMessage(error);
        });
};
</script>

<template>
    <v-dialog
        v-model="isOpen"
        max-width="420"
        :fullscreen="fullscreen"
        persistent
        role="alertdialog"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
        data-test="reauth-dialog"
    >
        <v-card v-if="reauthDialog.isOpen">
            <v-card-title :id="titleId">{{ t('reauth-dialog.title') }}</v-card-title>
            <v-card-text :id="messageId">
                <p v-if="method === 'email'" class="mb-4">
                    {{ t('reauth-dialog.intro-email') }}
                </p>
                <p v-else-if="!noMethod" class="mb-4">{{ t('reauth-dialog.intro') }}</p>
                <v-progress-linear
                    v-if="!methods && !errorMessage"
                    indeterminate
                    data-test="reauth-dialog-loading"
                />
                <v-alert
                    v-else-if="noMethod"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    data-test="reauth-dialog-no-method"
                >
                    {{ t('reauth-dialog.no-method') }}
                </v-alert>
                <form v-else-if="method === 'password'" novalidate @submit.prevent="submit">
                    <v-text-field
                        ref="passwordField"
                        v-model="password"
                        type="password"
                        autocomplete="current-password"
                        :label="t('reauth-dialog.label-password')"
                        :error-messages="errorMessage ? [errorMessage] : []"
                        data-test="reauth-dialog-password"
                    />
                </form>
                <form v-else-if="method === 'email'" novalidate @submit.prevent="submit">
                    <v-btn
                        variant="tonal"
                        class="mb-4"
                        :disabled="cooldown > 0"
                        data-test="reauth-dialog-send"
                        @click="sendCode"
                    >
                        {{
                            cooldown > 0
                                ? t('reauth-dialog.button-send-wait', { seconds: cooldown })
                                : t('reauth-dialog.button-send')
                        }}
                    </v-btn>
                    <p v-if="sent" class="mb-4" role="status" data-test="reauth-dialog-sent">
                        {{ t('reauth-dialog.sent') }}
                    </p>
                    <v-text-field
                        ref="codeField"
                        v-model="code"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                        :label="t('reauth-dialog.label-code')"
                        :error-messages="errorMessage ? [errorMessage] : []"
                        data-test="reauth-dialog-code"
                    />
                </form>
                <p
                    v-if="errorMessage && !method"
                    class="text-error"
                    data-test="reauth-dialog-error"
                >
                    {{ errorMessage }}
                </p>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" data-test="reauth-dialog-cancel" @click="isOpen = false">
                    {{ t('generic.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    variant="flat"
                    :disabled="!proof"
                    :loading="reauthing"
                    data-test="reauth-dialog-submit"
                    @click="submit"
                >
                    {{ t('reauth-dialog.button-submit') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
