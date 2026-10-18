<script setup lang="ts">
/**
 * @module
 * Staff set how many units of one product may be owed at once (a preorder's or a backorder's). The
 * dialog owns its call and reports a refusal in place. The number is absolute (`0` closes it), and may
 * sit below what is already outstanding: those orders stay, only new ones are refused — the hint says
 * so. "Unlimited" sends no cap at all.
 */
import { ref, watch, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useInventoryStore } from '../store.ts';
import type { InventoryLevel } from '@types';

/**
 * The board row being edited: its title names the dialog, its numbers seed the field.
 */
const props = defineProps<{
    level: InventoryLevel;
}>();

/**
 * Two-way `v-model`: whether the dialog is open.
 */
const isOpen = defineModel<boolean>({ required: true });

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report the outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The heading's id, so the dialog is announced by its title rather than as "dialog".
 */
const titleId = useId();

/**
 * Whether the dialog fills the screen — it does on a phone.
 */
const fullscreen = useFullscreenDialog();

/**
 * Hands focus back to the control that opened the dialog once it closes.
 */
useReturnFocus(() => isOpen.value);

/**
 * The store's write and its in-flight flag.
 */
const inventoryStore = useInventoryStore();

/**
 * True while any inventory call is in flight.
 */
const { loading } = storeToRefs(inventoryStore);

/**
 * The limit being typed; `undefined` while the field is empty.
 */
const limit = ref<number | undefined>(props.level.backorderLimit ?? undefined);

/**
 * Whether the product has no cap at all.
 */
const unlimited = ref(props.level.backorderLimit === null);

/**
 * This dialog's own blocked state.
 */
const {
    message: limitError,
    report: reportLimitError,
    clear: clearLimitError
} = useBlockingError();

/**
 * Starts from the row's current limit every time the dialog opens.
 */
watch(isOpen, (open) => {
    if (!open) return;
    limit.value = props.level.backorderLimit ?? undefined;
    unlimited.value = props.level.backorderLimit === null;
    clearLimitError();
});

/**
 * Saves the limit.
 *
 * @returns A promise settling once the call finished; a refusal blocks the dialog in place.
 */
const submit = () => {
    if (!unlimited.value && limit.value === undefined) return Promise.resolve();
    clearLimitError();
    return inventoryStore
        .setLimit(props.level.productId, unlimited.value ? null : (limit.value ?? 0))
        .then(() => {
            addMessage(t('backorder-limit-dialog.success'));
            isOpen.value = false;
        })
        .catch((error: unknown) => reportLimitError(error));
};
</script>

<template>
    <v-dialog
        v-model="isOpen"
        max-width="480"
        :fullscreen="fullscreen"
        :aria-labelledby="titleId"
        data-test="backorder-limit-dialog"
    >
        <v-card class="p-5">
            <h2 :id="titleId" class="mb-4 text-lg font-semibold">
                {{ t('backorder-limit-dialog.title', { name: level.title }) }}
            </h2>

            <form class="flex flex-col gap-3" novalidate @submit.prevent="submit">
                <v-checkbox
                    v-model="unlimited"
                    :label="t('backorder-limit-dialog.label-unlimited')"
                    :hint="t('backorder-limit-dialog.hint-unlimited')"
                    persistent-hint
                    density="compact"
                    data-test="backorder-limit-unlimited"
                />

                <v-number-input
                    v-model="limit"
                    :label="t('backorder-limit-dialog.label-limit')"
                    :hint="
                        t('backorder-limit-dialog.hint-limit', { outstanding: level.backordered })
                    "
                    persistent-hint
                    :disabled="unlimited"
                    :min="0"
                    :step="1"
                    :precision="0"
                    control-variant="stacked"
                    data-test="backorder-limit-field"
                />

                <InlineErrorAlert :message="limitError" data-test="backorder-limit-error" />

                <div class="mt-2 flex justify-end gap-2">
                    <v-btn
                        variant="tonal"
                        data-test="backorder-limit-cancel"
                        @click="isOpen = false"
                    >
                        {{ t('generic.cancel') }}
                    </v-btn>
                    <v-btn
                        type="submit"
                        color="primary"
                        :disabled="loading || (!unlimited && limit === undefined)"
                        data-test="backorder-limit-submit"
                    >
                        {{ t('backorder-limit-dialog.button-save') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
