<script lang="ts">
export default {
    name: 'StockMovementForm'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Receipt/adjustment form, instantiated twice with a `mode` prop rather than a runtime sign
 * toggle — so a mis-click cannot turn a delivery into a correction. Validation schema branches on
 * `mode` (strictly positive for a receipt, signed non-zero for an adjustment) and is handed to
 * `useAppForm`, which owns the field state and submit gating.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { useProductsStore } from '@/modules/products';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * The domain's two counter writes, one form: a RECEIPT (strictly positive — a delivery that
 * removes units is not a delivery) and an ADJUSTMENT (signed, shrinkage being the common case,
 * refused server-side when it would leave fewer units than are already promised to orders). Two
 * instances with a mode toggle rather than one form with a sign toggle, so a mis-click cannot turn
 * one transition into the other.
 */
const props = defineProps<{
    mode: 'receipt' | 'adjust';
}>();

/**
 * Whether this instance is the receipt form, as opposed to the adjustment form.
 */
const isReceipt = computed(() => props.mode === 'receipt');

/**
 * i18n translator for this component's template and messages.
 */
const { t } = useI18n();

/**
 * Toast dispatcher used to report the write's outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * Owns the receipt/adjustment writes and their loading flag.
 */
const inventoryStore = useInventoryStore();

/**
 * Source of the product select's options.
 */
const productsStore = useProductsStore();

/**
 * The catalogue, kept in sync via `fetchProducts` after every write.
 */
const { productsList } = storeToRefs(productsStore);

/**
 * True while the pending write is in flight; binds to the submit button.
 */
const { loading } = storeToRefs(inventoryStore);

/**
 * One select item per known product, so the form talks titles while the API talks ids.
 */
const productOptions = computed(() =>
    productsList.value.map((product) => ({ value: product.id, title: product.title }))
);

/**
 * The `<form>` element, handed to `useAppForm` for its native-validity wiring.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Zod schema, branching on `mode`: strictly positive for a receipt, signed non-zero for an adjustment.
 */
const schema = computed(() =>
    z.object({
        productId: z.string().min(1, { error: () => t('inventory-page.error-product-required') }),
        amount: isReceipt.value
            ? z
                  .number({ error: () => t('inventory-page.error-quantity-positive') })
                  .int({ error: () => t('inventory-page.error-quantity-positive') })
                  .min(1, { error: () => t('inventory-page.error-quantity-positive') })
            : z
                  .number({ error: () => t('inventory-page.error-delta-nonzero') })
                  .int({ error: () => t('inventory-page.error-delta-nonzero') })
                  .refine((delta) => delta !== 0, {
                      error: () => t('inventory-page.error-delta-nonzero')
                  }),
        note: z.string()
    })
);

/**
 * Field state, errors and submit gating, seeded with the mode's default amount sign.
 */
const { form, formErrors, showFormErrors, handleSubmit } = useAppForm(
    { productId: '', amount: props.mode === 'receipt' ? 10 : -1, note: '' },
    schema,
    { formElement }
);

/**
 * Validates and sends the write, reporting the counters it answered with.
 *
 * The interesting failure for an adjustment is the 409 — the correction would leave fewer units
 * than are already reserved — and the server's message says so; `notifyErrorMessages` carries it
 * through verbatim, because "cancel orders, don't make availability negative" is the fix and the
 * copy already names it.
 */
const submitForm = () =>
    handleSubmit(({ productId, amount, note }) =>
        (isReceipt.value
            ? inventoryStore.receive(productId, amount, note || undefined)
            : inventoryStore.adjust(productId, amount, note || undefined)
        )
            .then((level) => {
                addMessage(
                    t(
                        isReceipt.value
                            ? 'inventory-page.success-receipt'
                            : 'inventory-page.success-adjust',
                        { available: level?.available ?? 0 }
                    )
                );
                form.value.note = '';
                // The catalogue carries its own copy of the counters, so it has to hear about this too.
                return productsStore.fetchProducts();
            })
            .then(() => undefined)
            .catch((error: unknown) => notifyErrorMessages(addMessage, error))
    );
</script>

<template>
    <v-card class="p-4" :data-test="isReceipt ? 'receipt-form' : 'adjust-form'">
        <h2 class="mb-2 text-base font-semibold">
            {{ t(isReceipt ? 'inventory-page.receipt-title' : 'inventory-page.adjust-title') }}
        </h2>
        <form
            ref="formElement"
            novalidate
            class="flex flex-wrap items-start gap-3"
            @submit.prevent="submitForm"
        >
            <v-select
                v-model="form.productId"
                :items="productOptions"
                :label="t('inventory-page.label-product')"
                :error-messages="showFormErrors ? (formErrors.productId ?? []) : []"
                :data-test="isReceipt ? 'receipt-product' : 'adjust-product'"
                class="min-w-56"
                hide-details="auto"
            />
            <v-text-field
                v-model.number="form.amount"
                type="number"
                :min="isReceipt ? 1 : undefined"
                :label="
                    t(isReceipt ? 'inventory-page.label-quantity' : 'inventory-page.label-delta')
                "
                :hint="isReceipt ? undefined : t('inventory-page.hint-delta')"
                :persistent-hint="!isReceipt"
                :error-messages="showFormErrors ? (formErrors.amount ?? []) : []"
                :data-test="isReceipt ? 'receipt-quantity' : 'adjust-delta'"
                class="max-w-28"
                :hide-details="isReceipt ? 'auto' : undefined"
            />
            <v-text-field
                v-model="form.note"
                :label="
                    t(isReceipt ? 'inventory-page.label-note' : 'inventory-page.label-note-why')
                "
                :data-test="isReceipt ? 'receipt-note' : 'adjust-note'"
                class="min-w-40 grow"
                hide-details="auto"
            />
            <v-btn
                type="submit"
                :color="isReceipt ? 'primary' : 'secondary'"
                :data-test="isReceipt ? 'receipt-submit' : 'adjust-submit'"
                :disabled="loading"
            >
                {{
                    t(isReceipt ? 'inventory-page.button-receipt' : 'inventory-page.button-adjust')
                }}
            </v-btn>
        </form>
    </v-card>
</template>
