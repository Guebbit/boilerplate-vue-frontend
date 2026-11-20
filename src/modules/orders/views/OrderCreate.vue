<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'OrderCreatePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Staff's "New order": a counter sale, a phone order, or money taken outside the app. A create
 * screen on `useStructureFormValidation` inside `FormCard`. The buyer is "No account (walk-in)"
 * unless the viewer may read users and picks one; the lines come from the shared product picker.
 * Payment is not taken here: the order opens as any other, and the cash is recorded on it.
 * See: docs/modules/orders.md
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { Trash2 } from 'lucide-vue-next';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useLeaveGuard } from '@/ui/composables/use-leave-guard.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';
import { useProductPicker } from '@/modules/inventory';
import FormCard from '@/ui/organisms/FormCard.vue';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useAccountPicker } from '../composables/use-account-picker.ts';
import { useOrdersStore } from '../store.ts';
import { orderCreateForAccountSchema, orderCreateSchema } from '../schemas.ts';

/**
 * One line of the order being built, as the API takes it.
 */
interface OrderLine {
    productId: string;
    quantity: number;
}

/**
 * Translation and the toast dispatcher.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report the outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Router instance, for the navigation once the order exists.
 */
const router = useRouter();

/**
 * Store action.
 */
const { createOrder } = useOrdersStore();

/**
 * The signed-in viewer's session: its permissions decide whether an account can be picked, and the
 * leave guard reads it to tell a forced sign-out from a choice.
 */
const session = useSessionStore();

/**
 * Whether the viewer may look an account up. Without `read:User` the buyer is always a walk-in:
 * a manager can ring up a sale but is not shown the customer list.
 */
const canPickAccount = computed(() => session.can('read', 'User'));

/**
 * Reference to the mounted `FormCard`, read for its `<form>` element.
 */
const card = ref<InstanceType<typeof FormCard>>();

/**
 * Whether the buyer is an account. `false` is the walk-in default.
 */
const forAccount = ref(false);

/**
 * The schema for the buyer's kind: an account buyer must have one picked, a walk-in has none.
 */
const schema = computed(() => (forAccount.value ? orderCreateForAccountSchema : orderCreateSchema));

/**
 * Form state, validation and submission wiring from the shared form composable.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isDirty,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<{ userId?: string; email?: string; items: OrderLine[] }>(
    { items: [] },
    schema,
    {
        // The `<form>` lives in `FormCard`; read through a getter so the element is resolved when a
        // failed submit actually needs it, not while the card is still mounting.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof FormCard>), even with `formElement` explicitly exposed via FormCard.vue's own defineExpose
        formElement: () => card.value?.formElement,
        revalidateOn: locale,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * Warns before a half-built order is lost to a navigation; `markSaved` lifts it for a save.
 */
const { markSaved } = useLeaveGuard(isDirty, () => session.isAuth);

/**
 * This form's own blocked state: a failed create blocks the form in place rather than joining a
 * toast queue the visitor may have looked away from.
 */
const {
    message: submitError,
    report: reportSubmitError,
    clear: clearSubmitError
} = useBlockingError();

/**
 * The account search box and the options it found, for a viewer who may read users.
 */
const {
    query: accountQuery,
    options: accountOptions,
    search: searchAccounts,
    pick: pickAccount
} = useAccountPicker();

/** The email last prefilled from a picked account; a typed address differs from it and stays. */
let prefilledEmail: string | undefined;

/**
 * Blanks the email while it still holds the prefill, so a receipt never goes to an account that
 * was let go. A typed address stays.
 */
const clearPrefill = () => {
    if (prefilledEmail && form.value.email === prefilledEmail) form.value.email = undefined;
    prefilledEmail = undefined;
};

/**
 * Sets the buyer account and prefills the email from it, unless staff typed their own.
 *
 * @param id - The picked account id.
 */
const setAccount = (id: string | null) => {
    form.value.userId = id ?? undefined;
    const email = pickAccount(id);
    if (!email) {
        clearPrefill();
        return;
    }
    if (form.value.email && form.value.email !== prefilledEmail) return;
    form.value.email = email;
    prefilledEmail = email;
};

/**
 * Picks the buyer's kind. Back to a walk-in drops the account, so the order is sent without one.
 *
 * @param value - `true` when the buyer has an account.
 */
const setForAccount = (value: boolean | null) => {
    forAccount.value = value === true;
    if (forAccount.value) return;
    form.value.userId = undefined;
    pickAccount(undefined);
    clearPrefill();
};

/**
 * The product picker's search box and options, shared with the stock screens.
 */
const { query: productQuery, options: productOptions } = useProductPicker();

/**
 * The product chosen but not yet added as a line.
 */
const pendingProduct = ref<string>();

/**
 * How many of it.
 */
const pendingQuantity = ref(1);

/**
 * Titles of the products already added, so a line reads as a name rather than an id.
 */
const lineTitles = ref<Record<string, string>>({});

/**
 * Adds the pending product as a line, or adds to its line when it is already there.
 */
const addLine = () => {
    const productId = pendingProduct.value;
    const quantity = Math.trunc(pendingQuantity.value);
    if (!productId || !(quantity >= 1)) return;
    const existing = form.value.items.find((line) => line.productId === productId);
    if (existing) existing.quantity += quantity;
    else form.value.items.push({ productId, quantity });
    lineTitles.value[productId] =
        productOptions.value.find((option) => option.value === productId)?.title ?? productId;
    pendingProduct.value = undefined;
    pendingQuantity.value = 1;
};

/**
 * Drops one line.
 *
 * @param productId - The product of the line to remove.
 */
const removeLine = (productId: string) => {
    form.value.items = form.value.items.filter((line) => line.productId !== productId);
};

/**
 * Validates the form, raises the order, and opens it.
 *
 * @returns A promise resolving once the flow settles: invalid input reveals its errors, an API
 *  failure blocks the form in place.
 */
const submitForm = () => {
    clearSubmitError();
    return handleSubmit(() =>
        // A create has nothing to clear, so an absent account is omitted rather than sent as `null`.
        toRequestBody('CreateOrderBody', {
            userId: form.value.userId,
            email: form.value.email,
            items: form.value.items
        })
            .then((body) => createOrder(body))
            .then((created) => {
                markSaved();
                addMessage(t('order-create-page.success-create'));
                // Fire-and-forget: a NavigationFailure must not turn a completed create into an error.
                // eslint-disable-next-line @typescript-eslint/no-floating-promises -- vue-router reports a failed navigation through router.onError (app/router/index.ts)
                void router.push(
                    routerLinkI18n({ name: 'OrderTarget', params: { id: created.id } })
                );
            })
    ).catch((error: unknown) => {
        applyServerErrors(error, { onUnmapped: () => reportSubmitError(error) });
    });
};
</script>

<template>
    <div id="order-create-page">
        <FormCard
            ref="card"
            :submit-label="t('order-create-page.button-submit')"
            submit-test="order-create-submit"
            :back-to="{ name: 'SalesOrders' }"
            :back-label="t('order-create-page.button-go-to-list')"
            :loading="isSubmitting"
            @submit="submitForm"
        >
            <p class="mb-4 text-sm" data-test="order-create-hint">
                {{ t('order-create-page.hint') }}
            </p>

            <!-- Buyer: a walk-in by default; an account only for a viewer who may read users. -->
            <v-radio-group
                v-if="canPickAccount"
                :model-value="forAccount"
                :label="t('order-create-page.label-buyer')"
                data-test="order-buyer"
                @update:model-value="setForAccount"
            >
                <v-radio
                    :value="false"
                    :label="t('order-create-page.buyer-walk-in')"
                    data-test="order-buyer-walk-in"
                />
                <v-radio
                    :value="true"
                    :label="t('order-create-page.buyer-account')"
                    data-test="order-buyer-account"
                />
            </v-radio-group>
            <p v-else class="mb-2 text-sm" data-test="order-buyer-walk-in-note">
                {{ t('order-create-page.buyer-walk-in') }}
            </p>

            <!--
                Vuetify v-autocomplete: `search` is the typed text, `no-filter` leaves filtering to
                the server's own search.
                https://vuetifyjs.com/en/api/v-autocomplete/
            -->
            <v-autocomplete
                v-if="canPickAccount && forAccount"
                :model-value="form.userId"
                :search="accountQuery"
                :items="accountOptions"
                item-title="title"
                item-value="value"
                no-filter
                :label="t('order-create-page.label-account')"
                data-test="order-account"
                v-bind="fieldErrorProps(showErrors ? formErrors.userId : [])"
                class="mb-2"
                @update:model-value="setAccount"
                @update:search="searchAccounts"
            />

            <v-text-field
                v-model="form.email"
                type="email"
                data-test="order-email"
                :label="t('order-create-page.label-email')"
                :hint="t('order-create-page.hint-email')"
                persistent-hint
                v-bind="fieldErrorProps(showErrors ? formErrors.email : [])"
                class="mb-4"
            />

            <h2 class="mb-2 text-base font-medium">{{ t('order-create-page.title-lines') }}</h2>
            <div class="mb-2 flex items-start gap-2">
                <v-autocomplete
                    v-model="pendingProduct"
                    v-model:search="productQuery"
                    :items="productOptions"
                    item-title="title"
                    item-value="value"
                    no-filter
                    :label="t('order-create-page.label-product')"
                    data-test="order-product"
                    hide-details
                />
                <v-text-field
                    v-model.number="pendingQuantity"
                    type="number"
                    min="1"
                    :label="t('order-create-page.label-quantity')"
                    data-test="order-quantity"
                    hide-details
                    class="max-w-28"
                />
                <v-btn
                    type="button"
                    variant="tonal"
                    :disabled="!pendingProduct"
                    data-test="order-add-line"
                    @click="addLine"
                >
                    {{ t('order-create-page.button-add-line') }}
                </v-btn>
            </div>

            <ul v-if="form.items.length > 0" class="mb-2" data-test="order-lines">
                <li
                    v-for="line in form.items"
                    :key="line.productId"
                    class="flex items-center justify-between gap-2 py-1"
                    data-test="order-line"
                >
                    <span>{{ lineTitles[line.productId] }} × {{ line.quantity }}</span>
                    <v-btn
                        type="button"
                        icon
                        variant="text"
                        size="small"
                        :aria-label="
                            t('order-create-page.button-remove-line', {
                                title: lineTitles[line.productId]
                            })
                        "
                        data-test="order-remove-line"
                        @click="removeLine(line.productId)"
                    >
                        <Trash2 :size="16" aria-hidden="true" />
                    </v-btn>
                </li>
            </ul>
            <p
                v-if="showErrors && formErrors.items?.length"
                class="mb-2 text-sm text-error"
                data-test="order-lines-error"
            >
                {{ formErrors.items[0] }}
            </p>

            <InlineErrorAlert :message="submitError" data-test="order-create-error" />
        </FormCard>
    </div>
</template>
