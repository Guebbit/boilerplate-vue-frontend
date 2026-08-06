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

                <form novalidate class="flex flex-col gap-2" @submit.prevent="submitForm">
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

<script lang="ts">
export default {
    name: 'OrderEditPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/features/orders/store.ts';
import { orderStatusSchema } from '@/features/orders/schemas.ts';
import { z } from 'zod';
import { OrderStatus } from '@types';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { Pencil, ShoppingCart } from 'lucide-vue-next';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/components/organisms/ItemDetailLayout.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { EMPTY_VALUE, formatText, formatDateTime, formatCurrency } from '@/utils/formatters.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';

/**
 * Generic utility hooks.
 */
const { t, locale } = useI18n();
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
const { watchOrder, updateOrder } = useOrdersStore();
const { currentOrder, loading } = storeToRefs(useOrdersStore());

/**
 * Options of the status select.
 *
 * @returns One entry per `OrderStatus`, with a localized label.
 */
const statusOptions = computed(() =>
    Object.values(OrderStatus).map((value) => ({
        value,
        label: t(`orders-form.status-${value}`)
    }))
);

/**
 * Order edit form model.
 */
interface IOrderEditForm {
    status?: OrderStatus;
    email?: string;
}

/**
 * Validation schema for order updates.
 */
const editSchema = z.object({
    status: orderStatusSchema.optional(),
    email: z.preprocess(
        (v) => (v === '' ? undefined : v),
        z.email({ error: () => t('orders-form.email-invalid') }).optional()
    )
});

/**
 * Toolkit-managed form state.
 */
const {
    form,
    formErrors,
    showFormErrors,
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate
} = useStructureFormValidation<IOrderEditForm>({}, editSchema, { revalidateOn: locale });

/**
 * Auto-hydrate the form from the fetched record once it resolves.
 */
activateAutoHydrate(
    computed(() =>
        currentOrder.value
            ? {
                  status: currentOrder.value.status,
                  email: currentOrder.value.email ?? ''
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
    handleSubmit(async () => {
        if (!id) return;
        await updateOrder(id, {
            status: form.value.status,
            email: form.value.email || undefined
        });
        addMessage(t('order-edit-page.success-update'));
        showFormErrors.value = false;
    })
        .then((success) => {
            if (!success) showFormErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));

/**
 * Selects and (re)fetches the order whenever the route id changes.
 */
watchOrder(() => id);
</script>
