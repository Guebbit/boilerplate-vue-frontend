<script lang="ts">
export default {
    name: 'OrderEditPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Order-edit page. Loads one order by route id, exposes a status/email form
 * built on `useAppForm`, and the operator's cancel/refund actions — each
 * gated on the `actions` the server attaches to the loaded record.
 */
import { computed, ref } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useOrderRefund } from '@/modules/payments';
import { ordersStatusSchema } from '@/modules/orders/schemas.ts';
import { z } from 'zod';
import { OrderStatus } from '@types';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Pencil, ShoppingCart } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    EMPTY_VALUE,
    formatText,
    formatDateTime,
    formatCurrency
} from '@/infrastructure/utils/formatters.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

/**
 * Generic utility hooks.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Route order id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Orders store APIs and references.
 */
const { watchOrder, updateOrder, cancelOrder } = useOrdersStore();
const { currentOrder, loading } = storeToRefs(useOrdersStore());

/**
 * The money half of the operator's actions — `payments` answers for it, this page only asks.
 */
const { canRefund, refund } = useOrderRefund(computed(() => id));

/**
 * Options of the status select — the moves the SERVER says this operator may make, plus the status
 * the order is already in so the select can show what it is.
 *
 * Read from `actions.transitions` rather than listed from the enum: which value may follow which
 * depends on where the order is, and offering all six meant most picks came back as a 409. The
 * rules live in the API's order lifecycle and are not copied here, because a copy in a separately
 * deployed client is how the two come to disagree.
 *
 * @returns One entry per reachable status, with a localized label.
 */
const statusOptions = computed(() => {
    const current = currentOrder.value?.status;
    const reachable = currentOrder.value?.actions?.transitions ?? [];

    return [...(current ? [current] : []), ...reachable].map((value) => ({
        value,
        label: t(`orders-form.status-${value}`)
    }));
});

/**
 * The operator's money actions, and whether each is still open.
 *
 * Both halves are the server's answer: the order says whether it can be cancelled, the payment
 * whether money can come back. "Cancel and refund" is the two calls, which is why it needs both —
 * and why all three grey out on their own terms rather than on a rule spelled out here.
 */
const canCancel = computed(() => currentOrder.value?.actions?.cancel === true);
const canCancelAndRefund = computed(() => canCancel.value && canRefund.value);

/**
 * Cancels the order, with or without returning the money.
 *
 * @param refund - Whether the money goes back with the cancellation.
 * @returns A promise resolving once the order and its payment are re-read.
 */
const runCancel = (withRefund: boolean) => {
    if (!id) return Promise.resolve();
    return cancelOrder(id, withRefund)
        .then(() =>
            addMessage(
                t(withRefund ? 'order-edit-page.cancel-refund-done' : 'order-edit-page.cancel-done')
            )
        )
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

/**
 * Returns the money without touching the order's status.
 *
 * @returns A promise resolving once the payment is re-read, which is what greys the control out.
 */
const runRefund = () =>
    refund()
        .then(() => addMessage(t('order-edit-page.refund-done')))
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

/**
 * Order edit form model.
 */
interface OrderEditForm {
    status?: OrderStatus;
    email?: string;
}

/**
 * Validation schema for order updates.
 */
const editSchema = z.object({
    status: ordersStatusSchema.optional(),
    email: z.preprocess(
        (v) => (v === '' ? undefined : v),
        z.email({ error: () => t('orders-form.email-invalid') }).optional()
    )
});

/**
 * Toolkit-managed form state.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, validation and submission wiring from the shared app-form composable.
 */
const {
    form,
    formErrors,
    showFormErrors,
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate,
    applyServerErrors
} = useAppForm<OrderEditForm>({}, editSchema, { formElement });

/**
 * Auto-hydrate the form from the fetched record once it resolves.
 */
activateAutoHydrate(
    computed(() =>
        currentOrder.value
            ? {
                  status: currentOrder.value.status,
                  email: currentOrder.value.email
              }
            : undefined
    )
);

/**
 * Hero heading.
 *
 * @returns The loaded order id, the route id while loading, or the generic page
 *  title as a last resort.
 */
const heroTitle = computed(() => currentOrder.value?.id ?? id ?? t('order-edit-page.page-title'));

/**
 * Hero subheading.
 *
 * @returns The order notes, falling back to the customer email, then to the
 *  empty-value glyph.
 */
const heroDescription = computed(() =>
    formatText(currentOrder.value?.notes || currentOrder.value?.email)
);

/**
 * Localized order status.
 *
 * @returns The translated status label, or the empty-value glyph when the order
 *  carries no status yet.
 */
const orderStatus = computed(() => {
    const status = currentOrder.value?.status;
    return status ? t(`orders-form.status-${status}`) : EMPTY_VALUE;
});

/**
 * Validates the form and persists the order changes.
 *
 * @returns A promise resolving once the flow settles: a success toast, or the
 *  revealed validation errors when the input is invalid. API failures surface as
 *  a toast. A missing route id is a no-op.
 */
const submitForm = () =>
    handleSubmit(() => {
        if (!id) return;
        return updateOrder(id, {
            status: form.value.status,
            email: form.value.email || undefined
        }).then(() => {
            addMessage(t('order-edit-page.success-update'));
        });
    }).catch((error) => {
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });

/**
 * Selects and (re)fetches the order whenever the route id changes. `useOrderRefund` reads the
 * payment on the same id, because the refund controls are a fact about money the order record does
 * not carry.
 */
watchOrder(() => id);
</script>

<template>
    <LayoutDefault id="order-edit-page" :title="t('order-edit-page.page-title')">
        <ItemDetailLayout accent="tertiary">
            <template #hero>
                <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                    <template #icon><Pencil :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('order-target-page.label-order-id')"
                    :value="id ?? EMPTY_VALUE"
                />
                <CardMaterialStat
                    :title="t('order-target-page.label-status')"
                    :value="orderStatus"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('order-target-page.label-total')"
                    :value="formatCurrency(currentOrder?.totalPrice)"
                    accent="tertiary"
                />
            </template>

            <CardDetail>
                <div class="mb-5">
                    <h3 class="text-lg font-semibold">{{ t('generic.details') }}</h3>
                    <p class="mt-1 opacity-75">{{ t('order-edit-page.page-title') }}</p>
                </div>

                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
                >
                    <v-select
                        v-model="form.status"
                        :label="t('order-edit-page.label-status')"
                        :items="statusOptions"
                        item-title="label"
                        item-value="value"
                        :error-messages="showFormErrors ? formErrors.status : []"
                    />
                    <v-text-field
                        v-model="form.email"
                        type="email"
                        :label="t('order-edit-page.label-email')"
                        :error-messages="showFormErrors ? formErrors.email : []"
                    />

                    <div class="flex flex-wrap gap-2">
                        <v-btn type="submit" color="primary" :disabled="isSubmitting || loading">
                            {{ t('order-edit-page.button-submit') }}
                        </v-btn>
                        <v-btn variant="tonal" @click="resetForm">
                            {{ t('order-edit-page.reset-form') }}
                        </v-btn>
                    </div>
                </form>

                <!--
                    The operator's three money actions. Each is disabled on the server's own
                    answer — the order's `actions.cancel` and the payment's `actions.refund` —
                    rather than on a rule spelled out here, so a control is never offered for a
                    call the API would refuse.
                -->
                <div class="mt-6 border-t pt-5">
                    <h3 class="text-lg font-semibold">{{ t('order-edit-page.actions-title') }}</h3>
                    <p class="mt-1 mb-3 opacity-75">{{ t('order-edit-page.actions-hint') }}</p>

                    <div class="flex flex-wrap gap-2">
                        <v-btn
                            variant="tonal"
                            color="warning"
                            :disabled="!canCancel || loading"
                            @click="runCancel(false)"
                        >
                            {{ t('order-edit-page.button-cancel-only') }}
                        </v-btn>
                        <v-btn
                            variant="tonal"
                            color="warning"
                            :disabled="!canRefund || loading"
                            @click="runRefund"
                        >
                            {{ t('order-edit-page.button-refund-only') }}
                        </v-btn>
                        <v-btn
                            variant="flat"
                            color="error"
                            :disabled="!canCancelAndRefund || loading"
                            @click="runCancel(true)"
                        >
                            {{ t('order-edit-page.button-cancel-and-refund') }}
                        </v-btn>
                    </div>
                </div>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="tertiary">
                        <template #icon><ShoppingCart :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('order-target-page.label-date')"
                        :value="formatDateTime(currentOrder?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-updated-at')"
                        :value="formatDateTime(currentOrder?.updatedAt)"
                        icon="🕘"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-items')"
                        :value="currentOrder?.items?.length ?? 0"
                        icon="📦"
                    />
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="id"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'OrderTarget', params: { id } })"
                >
                    {{ t('order-edit-page.button-go-to-details') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'OrdersList' })">
                    {{ t('order-edit-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
