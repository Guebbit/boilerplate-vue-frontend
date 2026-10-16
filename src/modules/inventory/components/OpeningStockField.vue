<script setup lang="ts">
/**
 * @module
 * The opening-stock field of the product create form, contributed to the `product-create-extras`
 * slot by this module's manifest — the products module owns the form and never imports inventory.
 * Stock is not a product field: the create body carries none. This field asks the form for a step
 * to run once the product exists, and receives the count through the inventory door, which needs
 * `create:StockMovement`, so a caller without it is never shown the field. A failed receipt leaves
 * the product at zero, a valid state, and says to add stock from the Inventory page.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useInventoryStore } from '../store.ts';

/**
 * What the create form hands in: the function that takes a step to run with the new product's id.
 */
const { registerAfterCreate } = defineProps<{
    registerAfterCreate: (step: (productId: string) => Promise<void>) => void;
}>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report a receipt that did not land.
 */
const { addMessage } = useNotificationsStore();

/**
 * The session, asked whether the caller may book stock at all.
 */
const session = useSessionStore();

/**
 * The inventory store's receipt, which keeps its own `Idempotency-Key` across a retry.
 */
const { receive } = useInventoryStore();

/**
 * The count typed into the field. Zero means "no opening stock".
 */
const openingStock = ref(0);

registerAfterCreate((productId) => {
    const quantity = openingStock.value;
    if (!session.can('create', 'StockMovement') || !quantity || quantity < 1)
        return Promise.resolve();
    return receive(productId, quantity, t('opening-stock-field.note'))
        .then(() => undefined)
        .catch(() => {
            addMessage(t('opening-stock-field.failed'));
        });
});
</script>

<template>
    <v-number-input
        v-if="session.can('create', 'StockMovement')"
        v-model="openingStock"
        :label="t('opening-stock-field.label')"
        :min="0"
        :step="1"
        :precision="0"
        control-variant="stacked"
        data-test="product-on-hand-field"
        class="mb-2"
    />
</template>
