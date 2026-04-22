<template>
    <LayoutDefault id="product-edit-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('product-edit-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
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
                />
                <BaseCheckbox v-model="form.active" :label="t('product-edit-page.label-active')" />
                <BaseButton type="submit" :disabled="isSubmitting || loading">
                    {{ t('product-edit-page.button-submit') }}
                </BaseButton>
                <BaseButton type="button" @click="resetToCurrentProduct">
                    {{ t('product-edit-page.reset-form') }}
                </BaseButton>
            </form>
        </div>

        <div class="product-edit-actions">
            <RouterLink v-if="id" :to="routerLinkI18n({ name: 'ProductTarget', params: { id } })">
                {{ t('product-edit-page.button-go-to-details') }}
            </RouterLink>
            <RouterLink :to="routerLinkI18n({ name: 'ProductsList' })">
                {{ t('product-edit-page.button-go-to-list') }}
            </RouterLink>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductEditPage'
};
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import {
    useNotificationsStore,
    useStructureFormManagement as useStructureFormValidation
} from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/stores/products';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseCheckbox from '@/components/atoms/BaseCheckbox.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

/**
 * Generics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Props
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Products store
 */
const { fetchProduct, updateProduct, zodSchemaProducts } = useProductsStore();
const { currentProduct, selectedProductId, loading } = storeToRefs(useProductsStore());

/**
 * Form definition
 */
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

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);

/**
 * Reset form to the current product's data
 */
const resetToCurrentProduct = () => {
    form.value = {
        title: currentProduct.value?.title ?? '',
        price: currentProduct.value?.price ?? 0,
        description: currentProduct.value?.description ?? '',
        active: currentProduct.value?.active ?? false
    };
    showErrors.value = false;
};

/**
 * When the product data is loaded, pre-fill the form
 */
watch(
    currentProduct,
    (product) => {
        if (product) resetToCurrentProduct();
    },
    { immediate: true }
);

/**
 * Submit form and update the product
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
 * Load product data on mount
 */
if (id) {
    selectedProductId.value = id;
    fetchProduct(id);
}
</script>

<style lang="scss">
#product-edit-page {
    .theme-form-container {
        max-width: 600px;
        margin: 100px auto;
        padding: 2rem;
    }

    .product-edit-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
    }
}
</style>
