<script setup lang="ts">
/**
 * @module
 * One cart line, for both carts: the title, the quantity (announced as a status), the availability
 * badges the owner slots in, the priced line, and the two steppers plus Remove. It decides nothing —
 * what may be stepped and what a line is worth arrive as props, and every move leaves as an event —
 * so the signed-in cart and the guest cart share one card and differ only in their rules. Test
 * hooks are `<testPrefix>-item|-decrease|-increase|-remove|-line-price`.
 */
import { useI18n } from 'vue-i18n';
import { Minus, Plus } from 'lucide-vue-next';
import { currencyDigits, formatCurrency } from '@/infrastructure/utils/formatters.ts';
import { lineTotal } from '../domain';

/**
 * Component props — see each field's own doc comment below.
 */
const { title, quantity, unitPrice, currency, testPrefix } = defineProps<{
    /**
     * The product's title, already resolved; it also names the buttons for a screen reader.
     */
    title: string;
    /**
     * The quantity on the line.
     */
    quantity: number;
    /**
     * The product's unit price; absent until the product read answered, so no price is guessed.
     */
    unitPrice?: number;
    /**
     * The currency of {@link unitPrice}.
     */
    currency: string;
    /**
     * Whether the quantity may go down by one.
     */
    canDecrease: boolean;
    /**
     * Whether the quantity may go up by one.
     */
    canIncrease: boolean;
    /**
     * Whether Remove is disabled (a write is in flight).
     */
    removeDisabled?: boolean;
    /**
     * Prefix of the card's test hooks.
     */
    testPrefix: 'cart' | 'guest-cart';
}>();

/**
 * Slots: the badges that follow the quantity.
 */
defineSlots<{
    /**
     * Availability or legal chips shown beside the quantity.
     */
    badges?(): unknown;
}>();

/**
 * What the shopper asked for on this line.
 */
const emit = defineEmits<{
    /**
     * A stepper was pressed.
     */
    step: [delta: -1 | 1];
    /**
     * Remove was pressed.
     */
    remove: [];
}>();

/**
 * Translation function.
 */
const { t } = useI18n();
</script>

<template>
    <v-card :data-test="`${testPrefix}-item`" class="p-5">
        <h2 class="text-lg font-semibold">
            <b>{{ title }}</b>
        </h2>
        <!--
            A status: the steppers below change it, and a reader should hear the new number.
            The badges live inside it, so a line turning short is announced without a live region
            of its own per row. Text, not colour alone.
        -->
        <p class="mt-1" role="status">
            <span class="opacity-80">{{ t('cart-page.label-quantity') }}: {{ quantity }}</span>
            <slot name="badges" />
        </p>
        <p
            v-if="unitPrice !== undefined"
            class="mt-1 opacity-80"
            :data-test="`${testPrefix}-line-price`"
        >
            {{ formatCurrency(unitPrice, currency) }} × {{ quantity }} =
            {{ formatCurrency(lineTotal(unitPrice, quantity, currencyDigits(currency)), currency) }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
            <v-btn
                icon
                size="small"
                variant="tonal"
                :data-test="`${testPrefix}-decrease`"
                :disabled="!canDecrease"
                :aria-label="t('cart-page.button-decrease-named', { id: title })"
                @click="emit('step', -1)"
            >
                <Minus :size="16" aria-hidden="true" />
            </v-btn>
            <v-btn
                icon
                size="small"
                variant="tonal"
                :data-test="`${testPrefix}-increase`"
                :disabled="!canIncrease"
                :aria-label="t('cart-page.button-increase-named', { id: title })"
                @click="emit('step', 1)"
            >
                <Plus :size="16" aria-hidden="true" />
            </v-btn>
            <v-btn
                variant="text"
                color="error"
                :data-test="`${testPrefix}-remove`"
                :disabled="removeDisabled"
                :aria-label="t('cart-page.button-remove-named', { id: title })"
                @click="emit('remove')"
            >
                {{ t('cart-page.button-remove') }}
            </v-btn>
        </div>
    </v-card>
</template>
