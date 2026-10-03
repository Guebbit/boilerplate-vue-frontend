<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
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

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { copyToClipboard } from '@guebbit/js-toolkit';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import type { OrderTransferInstructions } from '@types';

/**
 * Props: the bank-transfer details to show and the optional payment deadline.
 */
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
 * Copies one field to the clipboard and toasts either way: a customer who thinks they copied the
 * IBAN and did not would send a transfer to nowhere.
 *
 * `@guebbit/js-toolkit`'s `copyToClipboard` tries the async Clipboard API first and falls back to
 * a hidden textarea + `execCommand('copy')`; it never rejects, only resolves `false` on failure.
 * https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
 *
 * @param value - The text to copy.
 */
const copy = (value: string) =>
    copyToClipboard(value).then((succeeded) =>
        succeeded
            ? addMessage(t('generic.secret-reveal-copied'))
            : addMessage(t('transfer-instructions-panel.copy-failed'), EToastType.DANGER)
    );

/**
 * How many characters make up one visual group of the grouped reference below.
 */
const REFERENCE_GROUP_LENGTH = 4;

/**
 * The reference, grouped into 4-character blocks for display — `RF132EY8H44VJAVZKX80JRL` becomes
 * `RF13 2EY8 H44V JAVZ KX80 JRL`, the shape a customer expects to copy an RF reference in. Display
 * only: `copy()` still sends the raw, ungrouped value, since the backend already tolerates spaces
 * and there is no reason to add ones of this component's own choosing to it.
 */
const groupedReference = computed(
    () =>
        instructions.reference
            .match(new RegExp(`.{1,${REFERENCE_GROUP_LENGTH}}`, 'g'))
            ?.join(' ') ?? instructions.reference
);
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
        </dl>

        <!--
            The reference gets its own block rather than a row in the `dl` above: it is the one
            field that has to reach the bank unchanged, so it is shown large, grouped and next to
            its own instruction rather than blending in with the beneficiary/IBAN/BIC.
        -->
        <div
            class="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3"
            data-test="transfer-reference-block"
        >
            <p class="m-0 text-xs opacity-70">
                {{ t('transfer-instructions-panel.label-reference') }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
                <p
                    class="m-0 font-mono text-xl font-semibold tracking-wide [overflow-wrap:anywhere]"
                    data-test="transfer-reference"
                >
                    {{ groupedReference }}
                </p>
                <v-btn
                    icon="mdi-content-copy"
                    size="x-small"
                    variant="text"
                    data-test="transfer-copy-reference"
                    :aria-label="t('transfer-instructions-panel.button-copy-reference')"
                    @click="copy(instructions.reference)"
                />
            </div>
            <p class="mt-2 mb-0 text-xs opacity-75">
                {{ t('transfer-instructions-panel.hint-reference') }}
            </p>
        </div>
    </v-card>
</template>
