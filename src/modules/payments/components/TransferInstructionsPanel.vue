<script lang="ts">
export default {
    name: 'TransferInstructionsPanel'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Order-page panel component: presentational only — everything it shows arrives on the order
 * itself, so there is no store call here, unlike `PaymentPanel`. The caller mounts it only while
 * `transferInstructions` is present, which the API already scopes to the order's own owner and
 * to staff, and only while the order is still `pending`.
 */

import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import type { OrderTransferInstructions } from '@types';

const { instructions } = defineProps<{
    /**
     * The beneficiary/IBAN/BIC/reference to transfer to.
     */
    instructions: OrderTransferInstructions;
    /**
     * When the hold ends — the sweep cancels the order past this with no money received.
     */
    payBy?: string;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used for the copy-to-clipboard confirmation.
 */
const { addMessage } = useNotificationsStore();

/**
 * Copies one field to the clipboard and confirms it with a toast.
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText — requires a secure
 * context, which every deployment of this app already is (the app itself is https-only).
 *
 * @param value - The text to copy.
 */
const copy = (value: string) =>
    navigator.clipboard.writeText(value).then(() => addMessage(t('generic.secret-reveal-copied')));
</script>

<template>
    <v-card class="p-4" data-test="transfer-instructions-panel">
        <h3 class="mb-2 text-base font-semibold">{{ t('transfer-instructions-panel.title') }}</h3>
        <p v-if="payBy" class="mb-3 text-sm opacity-75" data-test="transfer-deadline">
            {{ t('transfer-instructions-panel.label-deadline', { payBy: formatDateTime(payBy) }) }}
        </p>
        <dl class="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-2 text-sm">
            <dt class="opacity-70">{{ t('transfer-instructions-panel.label-beneficiary') }}</dt>
            <dd class="font-medium" data-test="transfer-beneficiary">
                {{ instructions.beneficiary }}
            </dd>
            <span />

            <dt class="opacity-70">{{ t('transfer-instructions-panel.label-iban') }}</dt>
            <dd class="font-medium" data-test="transfer-iban">{{ instructions.iban }}</dd>
            <v-btn
                icon="mdi-content-copy"
                size="x-small"
                variant="text"
                data-test="transfer-copy-iban"
                :aria-label="t('transfer-instructions-panel.button-copy-iban')"
                @click="copy(instructions.iban)"
            />

            <template v-if="instructions.bic">
                <dt class="opacity-70">{{ t('transfer-instructions-panel.label-bic') }}</dt>
                <dd class="font-medium" data-test="transfer-bic">{{ instructions.bic }}</dd>
                <span />
            </template>

            <dt class="opacity-70">{{ t('transfer-instructions-panel.label-reference') }}</dt>
            <dd class="font-medium" data-test="transfer-reference">{{ instructions.reference }}</dd>
            <v-btn
                icon="mdi-content-copy"
                size="x-small"
                variant="text"
                data-test="transfer-copy-reference"
                :aria-label="t('transfer-instructions-panel.button-copy-reference')"
                @click="copy(instructions.reference)"
            />
        </dl>
        <p class="mt-3 mb-0 text-xs opacity-75">
            {{ t('transfer-instructions-panel.hint-reference') }}
        </p>
    </v-card>
</template>
