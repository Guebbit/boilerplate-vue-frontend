<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'TestCardPicker'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The fake provider's test cards, as a picker — a development and e2e seam, never part of a
 * production bundle. `PaymentPanel` loads this file through a dynamic import behind
 * `import.meta.env.DEV || VITE_TEST_CARDS`, which the production build folds to `false`, so the
 * chunk is never emitted and the `pm_card_*` references below never ship.
 *
 * A live provider mounts its own widget where this stands, and hands back an opaque reference of
 * its own instead of a choice.
 */
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * The method references the fake provider recognises, labelled by what each one demonstrates, so
 * the interesting paths are reachable by clicking rather than by knowing a magic number.
 */
const TEST_CARDS = [
    'pm_card_visa',
    'pm_card_declined',
    'pm_card_authentication_required',
    'pm_card_processing'
] as const;

/**
 * The card that simply pays — what the picker selects until someone chooses another.
 */
const DEFAULT_TEST_CARD = 'pm_card_visa';

/**
 * The chosen reference. Starts empty; the picker fills in {@link DEFAULT_TEST_CARD} itself, so that
 * no `pm_card_*` literal lives in the panel, which ships.
 */
const paymentMethodRef = defineModel<string>({ required: true });

/**
 * Selects the default card when nothing is chosen yet.
 */
onMounted(() => {
    if (!paymentMethodRef.value) paymentMethodRef.value = DEFAULT_TEST_CARD;
});

/**
 * Whether the picker is locked — a payment call is in flight.
 */
const { disabled } = defineProps<{
    /**
     * Locks the picker while a payment call is in flight.
     */
    disabled?: boolean;
}>();

/**
 * Translation function, over messages that live in THIS file: the test cards' labels are as much
 * a part of the fake provider as the references are, so they stay out of the module's own locale
 * files, which every production bundle ships.
 */
const { t } = useI18n({
    useScope: 'local',
    messages: {
        en: {
            label: 'Payment method',
            hint: 'A live provider mounts its own widget here — this demo picks one of its test references instead.',
            pm_card_visa: 'Card that pays',
            pm_card_declined: 'Card the issuer declines',
            pm_card_authentication_required: 'Card the bank challenges (3-D Secure)',
            pm_card_processing: 'Method that settles later'
        },
        it: {
            label: 'Metodo di pagamento',
            hint: 'Un provider reale monta qui il proprio widget — questa demo sceglie invece uno dei suoi riferimenti di prova.',
            pm_card_visa: 'Carta che paga',
            pm_card_declined: "Carta rifiutata dall'emittente",
            pm_card_authentication_required: 'Carta con verifica della banca (3-D Secure)',
            pm_card_processing: 'Metodo che si completa più tardi'
        }
    }
});
</script>

<template>
    <v-select
        v-model="paymentMethodRef"
        :items="TEST_CARDS.map((value) => ({ value, title: t(value) }))"
        :label="t('label')"
        :hint="t('hint')"
        persistent-hint
        data-test="payment-method-select"
        :disabled="disabled"
        class="mb-3"
    />
</template>
