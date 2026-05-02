<template>
    <ItemDetailPage
        ref="detailPage"
        page-id="product-edit-page"
        page-class="product-detail"
        :page-title="t('product-edit-page.page-title')"
        :hero-eyebrow="id"
        :hero-title="heroTitle"
        :hero-description="heroDescription"
        hero-icon="✏️"
        :section-title="t('generic.details')"
        :section-description="t('product-edit-page.page-title')"
        edit-mode
        @submit="submitForm"
    >
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
        <BaseCheckbox v-model="form.active" :label="t('product-edit-page.label-active')" />

        <div class="item-detail__form-actions">
            <BaseButton type="submit" :disabled="isSubmitting || loading">
                {{ t('product-edit-page.button-submit') }}
            </BaseButton>
            <BaseButton type="button" @click="resetForm">
                {{ t('product-edit-page.reset-form') }}
            </BaseButton>
        </div>

        <template #stats>
            <MaterialStatCard :title="t('product-target-page.label-id')" :value="id ?? emptyValue" />
            <MaterialStatCard
                :title="t('product-target-page.label-price')"
                :value="formatNumber(currentProduct?.price, priceFormat)"
                accent="secondary"
            />
            <MaterialStatCard
                :title="t('product-target-page.label-active')"
                :value="formatFlag(currentProduct?.active, t('generic.enabled'), t('generic.disabled'))"
                accent="tertiary"
            />
        </template>

        <template #aside>
            <MaterialGraphicCard :title="heroTitle" :description="heroDescription" variant="primary" />
            <ItemDetailField :label="t('product-target-page.label-id')" :value="id ?? emptyValue" icon="#" />
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
        </template>

        <template #actions>
            <RouterLink v-if="id" :to="routerLinkI18n({ name: 'ProductTarget', params: { id } })" class="theme-button">
                {{ t('product-edit-page.button-go-to-details') }}
            </RouterLink>
            <RouterLink :to="routerLinkI18n({ name: 'ProductsList' })" class="theme-button">
                {{ t('product-edit-page.button-go-to-list') }}
            </RouterLink>
        </template>
    </ItemDetailPage>
</template>

<script lang="ts">
export default {
    name: 'ProductEditPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/stores/products';
import { z } from 'zod';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseCheckbox from '@/components/atoms/BaseCheckbox.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailPage from '@/components/organisms/ItemDetailPage.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { id } = defineProps<{
    id?: string;
}>();

const { fetchProduct, updateProduct, zodSchemaProducts } = useProductsStore();
const { currentProduct, selectedProductId, loading } = storeToRefs(useProductsStore());
const { emptyValue, formatText, formatDateTime, formatNumber, formatFlag } = useItemDetailDisplay();

interface IProductEditForm {
    title?: string;
    price?: number;
    description?: string;
    active?: boolean;
}

const editSchema = zodSchemaProducts.pick({ title: true, price: true }).extend({
    description: z.string().optional(),
    active: z.boolean().optional()
});

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IProductEditForm>({}, editSchema);

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

const priceFormat = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
} satisfies Intl.NumberFormatOptions;

const heroTitle = computed(() => currentProduct.value?.title ?? id ?? t('product-edit-page.page-title'));
const heroDescription = computed(() => formatText(currentProduct.value?.description));

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

useItemDetailRecord({
    id,
    selectedId: selectedProductId,
    fetchRecord: fetchProduct
});
</script>
