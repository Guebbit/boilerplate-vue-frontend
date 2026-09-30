<script setup lang="ts">
/**
 * @module
 * Step-up re-authentication prompt: mounted once by `LayoutDefault.vue`, beside `<DialogHost />`.
 * One password field. On submit it calls `useSessionStore().reauth()` itself — the interceptor that
 * opened it only needed to know when a fresh session exists, not how one gets there — and a wrong
 * password stays open for another try rather than closing.
 */
import { computed, nextTick, ref, useId, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import type { VTextField } from 'vuetify/components';
import { useReauthPromptStore } from '@/infrastructure/http/reauth-prompt.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { absentIs, getErrorMessage } from '@/infrastructure/utils/errors.ts';

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

watch(
    () => reauthDialog.isOpen,
    (open) => {
        if (!open) return;
        password.value = '';
        errorMessage.value = undefined;
        void nextTick(() => passwordField.value?.focus());
    }
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
 * Proves the password and, on success, tells the interceptor a fresh session exists.
 *
 * @returns A promise resolving once the attempt settles. The prompt stays open either way, since
 *  the parked requests are still worth retrying once the visitor can — but a wrong password (401)
 *  and any other failure (network, 5xx) are told apart: retyping the same password again is never
 *  the right next step for a failure the password had nothing to do with.
 */
const submit = () => {
    if (!password.value) return;
    return useSessionStore()
        .reauth(password.value)
        .then(() => {
            reauthDialog.resolveStepUp();
        })
        .catch((error: unknown) => {
            errorMessage.value = absentIs(error, 401)
                ? t('reauth-dialog.error-wrong-password')
                : getErrorMessage(error);
            password.value = '';
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
                <p class="mb-4">{{ t('reauth-dialog.intro') }}</p>
                <form novalidate @submit.prevent="submit">
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
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" data-test="reauth-dialog-cancel" @click="isOpen = false">
                    {{ t('generic.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    variant="flat"
                    :disabled="!password"
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
