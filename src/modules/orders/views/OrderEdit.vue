<script lang="ts">
export default {
    name: 'OrderEditPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Order-edit page. Loads one order by route id, exposes an email-only edit form built on
 * `useStructureFormValidation`, and the operator's cancel/refund/override actions — each gated
 * on the `actions` the server attaches to the loaded record. `status` is not a form field: it
 * moves only through the cancel and override actions below.
 */
import { computed, ref } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useOrderActionsRefetch } from '@/modules/orders/composables/use-order-actions-refetch.ts';
import { useOrderRefund, RecordOfflinePaymentForm } from '@/modules/payments';
import { z } from 'zod';
import type { OrderStatus } from '@types';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Calendar, Clock, Package, Pencil, ShoppingCart } from 'lucide-vue-next';
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
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Generic utility hooks.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
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
const { watchOrder, fetchOrder, updateOrder, cancelOrder, overrideStatus } = useOrdersStore();

/**
 * Correct-status form state, cleared after every submit.
 */
const overrideTo = ref<OrderStatus>();
const overrideReason = ref('');

/**
 * The override door's own blocked state — its own dedicated select/textarea/button, so it
 * blocks in place rather than joining a toast queue the operator may have looked away from.
 */
const {
    message: overrideError,
    report: reportOverrideError,
    clear: clearOverrideError
} = useBlockingError();

/**
 * Submits the correction. The status/actions refresh comes from the store: `overrideStatus`
 * writes through `updateTarget`, which replaces both the cached record and its query-cache entry
 * — every other page's `watchOrder` reads the new status too, no separate forced fetch needed
 * here.
 *
 * @returns A promise resolving once the correction lands. A missing route id or target status
 *  is a no-op — the submit button is disabled until both are set.
 */
const runOverride = () => {
    if (!id || !overrideTo.value) return Promise.resolve();
    clearOverrideError();
    return overrideStatus(id, overrideTo.value, overrideReason.value)
        .then(() => {
            overrideTo.value = undefined;
            overrideReason.value = '';
            addMessage(t('order-edit-page.override-done'));
        })
        .catch((error: unknown) => reportOverrideError(error));
};

/**
 * The order being displayed, and whether it is in flight.
 */
const { currentOrder, loading } = storeToRefs(useOrdersStore());

/**
 * The order's own `actions.override` — every status `POST /orders/{id}/status-override` would
 * currently accept for this caller. Empty for anyone without `orders.any.override`, or once the
 * order has left every overridable status — the server's answer, not a locally filtered copy.
 */
const overrideTargets = computed(() => currentOrder.value?.actions?.override ?? []);

/**
 * Whether the correction door renders at all.
 */
const canOverride = computed(() => overrideTargets.value.length > 0);

/**
 * The select's own options, off {@link overrideTargets} directly — no status this caller could not
 * actually reach is ever offered.
 */
const overrideStatusOptions = computed(() =>
    overrideTargets.value.map((value) => ({ value, label: t(`orders-form.status-${value}`) }))
);

/**
 * The money half of the operator's actions — `payments` answers for it, this page only asks.
 */
const { canRefund, refund, refreshPayment, refundLoading } = useOrderRefund(computed(() => id));

/**
 * The operator's money actions, and whether each is still open.
 *
 * Both halves are the server's answer: the order says whether it can be cancelled, the payment
 * whether money can come back. "Cancel and refund" is the two calls, which is why it needs both —
 * and why all three grey out on their own terms rather than on a rule spelled out here.
 */
const canCancel = computed(() => currentOrder.value?.actions?.cancel === true);

/**
 * Whether both halves of "cancel and refund" are available, which is what the combined
 * button needs.
 */
const canCancelAndRefund = computed(() => canCancel.value && canRefund.value);

/**
 * Whether the order can still reach `paid` — the same gate the customer's own card form uses,
 * asked here for the operator's "record it by hand" form instead. An in-flight card charge is a
 * narrower case this flag does not see; the API's own 409 for it surfaces as that form's toast.
 */
const canRecordOffline = computed(() => currentOrder.value?.actions?.pay === true);

/**
 * The offline-payment refresh's own blocked state. The form's own submit failures surface inside
 * `RecordOfflinePaymentForm` itself; this only covers the forced re-fetch that follows a success.
 */
const {
    message: offlinePaymentRefreshError,
    report: reportOfflinePaymentRefreshError,
    clear: clearOfflinePaymentRefreshError
} = useBlockingError();

/**
 * Reloads the order once money has been recorded by hand — its status moved `pending → paid`
 * server-side, which the form's own state does not reflect. Forced: `watchOrder`'s cache still
 * holds the pre-payment record, same as the correction door's own forced re-fetch above.
 */
const onOfflinePaymentRecorded = () => {
    if (!id) return;
    clearOfflinePaymentRefreshError();
    void fetchOrder(id, { forced: true }).catch((error: unknown) =>
        reportOfflinePaymentRefreshError(error)
    );
};

/**
 * The three money-action buttons' own blocked state — cancel-only and cancel-and-refund are the
 * same {@link runCancel} call with a different flag, and refund-only sits in the same "actions"
 * section right beside them, so one blocked state covers all three rather than one per button.
 */
const {
    message: actionsError,
    report: reportActionsError,
    clear: clearActionsError
} = useBlockingError();

/**
 * Cancels the order, with or without returning the money. The order re-read is the store's own
 * `updateTarget` write; the payment is a sibling record the order's cache entry knows nothing
 * about, so it needs its own re-read here — otherwise "Refund only" stays enabled on a payment
 * that a `withRefund` cancel already settled.
 *
 * @param withRefund - Whether the money goes back with the cancellation.
 * @returns A promise resolving once the order and its payment are re-read.
 */
const runCancel = (withRefund: boolean) => {
    if (!id) return Promise.resolve();
    clearActionsError();
    return cancelOrder(id, withRefund)
        .then(() =>
            refreshPayment().then(() =>
                addMessage(
                    t(
                        withRefund
                            ? 'order-edit-page.cancel-refund-done'
                            : 'order-edit-page.cancel-done'
                    )
                )
            )
        )
        .catch((error: unknown) => reportActionsError(error));
};

/**
 * Returns the money without touching the order's status.
 *
 * @returns A promise resolving once the payment is re-read, which is what greys the control out.
 */
const runRefund = () => {
    clearActionsError();
    return refund()
        .then(() => addMessage(t('order-edit-page.refund-done')))
        .catch((error: unknown) => reportActionsError(error));
};

/**
 * Order edit form model. `status` is not editable here — it moves only through the cancel and
 * override actions below, never a field on this form. See `docs/theory/tactical-ddd.md`.
 */
interface OrderEditForm {
    email?: string;
}

/**
 * Validation schema for order updates.
 */
const editSchema = z.object({
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
} = useStructureFormValidation<OrderEditForm>({}, editSchema, {
    formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Auto-hydrate the form from the fetched record once it resolves.
 */
activateAutoHydrate(
    computed(() => (currentOrder.value ? { email: currentOrder.value.email } : undefined))
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
 * The edit form's own blocked state — a failed save blocks this specific form, separate from
 * the operator's action buttons below it.
 */
const { message: formError, report: reportFormError, clear: clearFormError } = useBlockingError();

/**
 * Validates the form and persists the order changes.
 *
 * Sends `email` only when it actually differs from the loaded record — an unconditional resend
 * is a no-op on the server (`orders/services/crud.ts`'s `update` merges it either way), but it
 * still writes the document and audits `ORDER_UPDATED` every time staff opens and saves the form
 * without touching anything, the same "diff against the hydrated record" rule D17d adopted for
 * the account form.
 * @returns A promise resolving once the flow settles: a success toast, or the
 *  revealed validation errors when the input is invalid. An API failure blocks the form in
 *  place ({@link formError}). A missing route id is a no-op.
 */
const submitForm = () => {
    clearFormError();
    return handleSubmit(() => {
        if (!id) return;
        const email = form.value.email || undefined;
        const changes = email === currentOrder.value?.email ? {} : { email };

        return updateOrder(id, changes).then(() => {
            addMessage(t('order-edit-page.success-update'));
        });
    }).catch((error) => {
        if (!applyServerErrors(error)) reportFormError(error);
    });
};

/**
 * Selects and (re)fetches the order whenever the route id changes. `useOrderRefund` reads the
 * payment on the same id, because the refund controls are a fact about money the order record does
 * not carry.
 */
watchOrder(() => id);

/**
 * Forces the one re-fetch a list-cache arrival needs to gain `actions` — without it, an order
 * opened from the list renders with cancel, refund and override all greyed out, since every
 * control on this page gates on that field.
 */
useOrderActionsRefetch(currentOrder, () => id, fetchOrder);
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
                    :value="
                        formatCurrency(currentOrder?.totalPrice, currentOrder?.currency ?? 'EUR')
                    "
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
                    <v-text-field
                        v-model="form.email"
                        data-test="order-edit-email"
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

                    <InlineErrorAlert :message="formError" data-test="order-edit-form-error" />
                </form>

                <!--
                    Money coming in another way — cash, a transfer — while the order can still
                    reach `paid`. Own section: it is not a cancel/refund action, and it needs three
                    fields the buttons below have no room for.
                -->
                <div v-if="canRecordOffline && id" class="mt-6 border-t pt-5">
                    <h3 class="text-lg font-semibold">
                        {{ t('order-edit-page.record-offline-title') }}
                    </h3>
                    <p class="mt-1 mb-3 opacity-75">
                        {{ t('order-edit-page.record-offline-hint') }}
                    </p>
                    <RecordOfflinePaymentForm :order-id="id" @recorded="onOfflinePaymentRecorded" />

                    <InlineErrorAlert
                        :message="offlinePaymentRefreshError"
                        class="mt-3"
                        data-test="order-edit-offline-payment-error"
                    />
                </div>

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
                            data-test="button-cancel-only"
                            :disabled="!canCancel || loading"
                            @click="runCancel(false)"
                        >
                            {{ t('order-edit-page.button-cancel-only') }}
                        </v-btn>
                        <v-btn
                            variant="tonal"
                            color="warning"
                            data-test="button-refund-only"
                            :disabled="!canRefund || loading || refundLoading"
                            @click="runRefund"
                        >
                            {{ t('order-edit-page.button-refund-only') }}
                        </v-btn>
                        <v-btn
                            variant="flat"
                            color="error"
                            data-test="button-cancel-and-refund"
                            :disabled="!canCancelAndRefund || loading"
                            @click="runCancel(true)"
                        >
                            {{ t('order-edit-page.button-cancel-and-refund') }}
                        </v-btn>
                    </div>

                    <InlineErrorAlert
                        :message="actionsError"
                        class="mt-3"
                        data-test="order-edit-actions-error"
                    />
                </div>

                <!--
                    The admin-only correction door: PUT /orders/:id carries no status field, so
                    this is the only way onto processing/shipped/delivered outside the ordinary
                    flow. Gated on the `orders.any.override` permission, not on any order-state
                    flag, since the whole point is bypassing the ordinary rule.
                -->
                <div v-if="canOverride" class="mt-6 border-t pt-5">
                    <h3 class="text-lg font-semibold">{{ t('order-edit-page.override-title') }}</h3>
                    <p class="mt-1 mb-3 opacity-75">{{ t('order-edit-page.override-hint') }}</p>

                    <v-select
                        v-model="overrideTo"
                        data-test="override-status-select"
                        :label="t('order-edit-page.label-status')"
                        :items="overrideStatusOptions"
                        item-title="label"
                        item-value="value"
                    />
                    <v-textarea
                        v-model="overrideReason"
                        data-test="override-reason"
                        :label="t('order-edit-page.label-override-reason')"
                        rows="2"
                    />
                    <v-btn
                        color="warning"
                        variant="flat"
                        data-test="button-override"
                        :disabled="!overrideTo || !overrideReason || loading"
                        @click="runOverride"
                    >
                        {{ t('order-edit-page.button-override') }}
                    </v-btn>

                    <InlineErrorAlert
                        :message="overrideError"
                        class="mt-3"
                        data-test="order-edit-override-error"
                    />
                </div>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" accent="tertiary">
                        <template #icon><ShoppingCart :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('order-target-page.label-date')"
                        :value="formatDateTime(currentOrder?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-updated-at')"
                        :value="formatDateTime(currentOrder?.updatedAt)"
                        :icon="Clock"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-items')"
                        :value="currentOrder?.items?.length ?? 0"
                        :icon="Package"
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
