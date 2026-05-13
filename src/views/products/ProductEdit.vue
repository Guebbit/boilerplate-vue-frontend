<template>
    <LayoutDefault id="product-edit-page" class="item-detail-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('product-edit-page.page-title') }}</span>
            </h1>
        </template>

        <section class="item-detail-page-content">
            <div class="item-detail-page-grid-top">
                <DetailCard class="item-detail-page-hero animate-on-hover">
                    <div class="item-detail-page-hero-icon" aria-hidden="true">✏️</div>
                    <div>
                        <p v-if="id" class="item-detail-page-eyebrow">{{ id }}</p>
                        <h2 class="item-detail-page-hero-title">{{ heroTitle }}</h2>
                        <p class="item-detail-page-hero-description">{{ heroDescription }}</p>
                    </div>
                </DetailCard>

                <div class="item-detail-page-stats">
                    <MaterialStatCard
                        :title="t('product-target-page.label-id')"
                        :value="id ?? EMPTY_VALUE"
                    />
                    <MaterialStatCard
                        :title="t('product-target-page.label-price')"
                        :value="formatCurrency(currentProduct?.price)"
                        accent="secondary"
                    />
                    <MaterialStatCard
                        :title="t('product-target-page.label-active')"
                        :value="
                            formatFlag(
                                currentProduct?.active,
                                t('generic.enabled'),
                                t('generic.disabled')
                            )
                        "
                        accent="tertiary"
                    />
                </div>
            </div>

            <div class="item-detail-page-grid-main item-detail-page-grid-main-with-aside">
                <DetailCard class="item-detail-page-main">
                    <div class="item-detail-page-section-header">
                        <h3>{{ t('generic.details') }}</h3>
                        <p>{{ t('product-edit-page.page-title') }}</p>
                    </div>

                    <form class="theme-form item-detail-page-form" @submit.prevent="submitForm">
                        <BaseInput
                            v-model="form.title"
                            type="text"
                            :label="t('product-edit-page.label-title')"
                            :errors="formErrors.title"
                            :show-errors="showErrors"
                        />
                        <BaseInput
                            v-model="form.price"
                            type="number"
                            :label="t('product-edit-page.label-price')"
                            :min="0"
                            :step="0.01"
                            :errors="formErrors.price"
                            :show-errors="showErrors"
                        />
                        <BaseInput
                            v-model="form.description"
                            :label="t('product-edit-page.label-description')"
                            multiline
                            :rows="5"
                        />
                        <BaseCheckbox
                            v-model="form.active"
                            :label="t('product-edit-page.label-active')"
                        />

                        <div class="item-detail-page-form-actions">
                            <BaseButton type="submit" :disabled="isSubmitting || loading">
                                {{ t('product-edit-page.button-submit') }}
                            </BaseButton>
                            <BaseButton type="button" @click="resetForm">
                                {{ t('product-edit-page.reset-form') }}
                            </BaseButton>
                        </div>
                    </form>
                </DetailCard>

                <DetailCard as="aside" class="item-detail-page-aside">
                    <MaterialGraphicCard
                        :title="heroTitle"
                        :description="heroDescription"
                        variant="primary"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-id')"
                        :value="id ?? EMPTY_VALUE"
                        icon="#"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-created-at')"
                        :value="formatDateTime(currentProduct?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-updated-at')"
                        :value="formatDateTime(currentProduct?.updatedAt)"
                        icon="🕘"
                    />
                </DetailCard>
            </div>

            <div class="item-detail-page-actions">
                <RouterLink
                    v-if="id"
                    :to="routerLinkI18n({ name: 'ProductTarget', params: { id } })"
                    class="theme-button"
                >
                    {{ t('product-edit-page.button-go-to-details') }}
                </RouterLink>
                <RouterLink :to="routerLinkI18n({ name: 'ProductsList' })" class="theme-button">
                    {{ t('product-edit-page.button-go-to-list') }}
                </RouterLink>
            </div>
        </section>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductEditPage'
};
</script>

<script setup lang="ts">
import '@/styles/features/itemDetail.scss';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/stores/products';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseCheckbox from '@/components/atoms/BaseCheckbox.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import DetailCard from '@/components/molecules/DetailCard.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';
import { EMPTY_VALUE } from '@/utils/constants.ts';

/**
 * Generic i18n and notification helpers.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Product identifier extracted from route params.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Product store APIs and reactive references.
 */
const { fetchProduct, updateProduct, zodSchemaProducts } = useProductsStore();
const { currentProduct, selectedProductId, loading } = storeToRefs(useProductsStore());

/**
 * Shared detail display helpers.
 */
const { formatText, formatDateTime, formatCurrency, formatFlag } = useItemDetailDisplay();

/**
 * Form model used by the update workflow.
 */
interface IProductEditForm {
    title?: string;
    price?: number;
    description?: string;
    active?: boolean;
}

/**
 * Edit validation schema.
 */
const editSchema = zodSchemaProducts.pick({ title: true, price: true }).extend({
    description: z.string().optional(),
    active: z.boolean().optional()
});

/**
 * Toolkit form state and submit handler.
 */
const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IProductEditForm>({}, editSchema);

/**
 * Shared form hydration + watcher activation.
 */
const { showErrors, resetForm } = useItemDetailForm({
    currentItem: currentProduct,
    form,
    mapToForm: (product) => ({
        title: product?.title ?? '',
        price: product?.price ?? 0,
        description: product?.description ?? '',
        active: product?.active ?? false
    })
});

/**
 * Hero metadata.
 */
const heroTitle = computed(
    () => currentProduct.value?.title ?? id ?? t('product-edit-page.page-title')
);
const heroDescription = computed(() => formatText(currentProduct.value?.description));

/**
 * Validates and submits product updates.
 */
const submitForm = () =>
    handleSubmit(async () => {
        if (!id || form.value.title === undefined || form.value.price === undefined) return;
        await updateProduct(id, {
            title: form.value.title,
            price: form.value.price,
            description: form.value.description || undefined,
            active: form.value.active
        });
        addMessage(t('product-edit-page.success-update'));
        showErrors.value = false;
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));

/**
 * Activates record selection + onBeforeMount product load.
 */
useItemDetailRecord({
    id,
    selectedId: selectedProductId,
    fetchRecord: fetchProduct
});
</script>
