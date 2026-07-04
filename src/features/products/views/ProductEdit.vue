<template>
    <LayoutDefault id="product-edit-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('product-edit-page.page-title') }}</span>
            </h1>
        </template>

        <section class="d-flex flex-column ga-6">
            <VRow>
                <VCol cols="12" lg="6">
                    <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                        <template #icon><VIcon icon="$pencil" size="36" /></template>
                    </ItemDetailHero>
                </VCol>

                <VCol cols="12" lg="6">
                    <VRow>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('product-target-page.label-id')"
                                :value="id ?? EMPTY_VALUE"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('product-target-page.label-price')"
                                :value="formatCurrency(currentProduct?.price)"
                                accent="secondary"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
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
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>

            <VRow>
                <VCol cols="12" lg="8">
                    <CardDetail>
                        <div class="mb-4">
                            <h3 class="text-h6">{{ t('generic.details') }}</h3>
                            <p class="text-body-2 mb-0">{{ t('product-edit-page.page-title') }}</p>
                        </div>

                        <VCard class="pa-4" variant="tonal">
                            <form @submit.prevent="submitForm">
                                <VRow>
                                    <VCol cols="12" md="6">
                                        <BaseInput
                                            v-model="form.title"
                                            type="text"
                                            :label="t('product-edit-page.label-title')"
                                            :errors="formErrors.title"
                                            :show-errors="showErrors"
                                        />
                                    </VCol>
                                    <VCol cols="12" md="6">
                                        <BaseInput
                                            v-model="form.price"
                                            type="number"
                                            :label="t('product-edit-page.label-price')"
                                            :min="0"
                                            :step="0.01"
                                            :errors="formErrors.price"
                                            :show-errors="showErrors"
                                        />
                                    </VCol>
                                    <VCol cols="12">
                                        <BaseInput
                                            v-model="form.description"
                                            :label="t('product-edit-page.label-description')"
                                            multiline
                                            :rows="5"
                                        />
                                    </VCol>
                                    <VCol cols="12">
                                        <BaseCheckbox
                                            v-model="form.active"
                                            :label="t('product-edit-page.label-active')"
                                        />
                                    </VCol>
                                    <VCol cols="12">
                                        <div class="d-flex flex-wrap justify-end ga-3">
                                            <BaseButton
                                                type="submit"
                                                :disabled="isSubmitting || loading"
                                            >
                                                {{ t('product-edit-page.button-submit') }}
                                            </BaseButton>
                                            <BaseButton type="button" @click="resetForm">
                                                {{ t('product-edit-page.reset-form') }}
                                            </BaseButton>
                                        </div>
                                    </VCol>
                                </VRow>
                            </form>
                        </VCard>
                    </CardDetail>
                </VCol>

                <VCol cols="12" lg="4">
                    <CardDetail as="aside" class="d-flex flex-column ga-4">
                        <CardInfo
                            :title="heroTitle"
                            :description="heroDescription"
                            variant="primary"
                        >
                            <template #icon><VIcon icon="$package" size="32" /></template>
                        </CardInfo>
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
                    </CardDetail>
                </VCol>
            </VRow>

            <div class="d-flex flex-wrap ga-3">
                <VBtn
                    v-if="id"
                    :to="routerLinkI18n({ name: 'ProductTarget', params: { id } })"
                    color="primary"
                    prepend-icon="$eye"
                >
                    {{ t('product-edit-page.button-go-to-details') }}
                </VBtn>
                <VBtn :to="routerLinkI18n({ name: 'ProductsList' })" variant="tonal">
                    {{ t('product-edit-page.button-go-to-list') }}
                </VBtn>
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
import { computed } from 'vue';
import { VBtn, VCard, VCol, VIcon, VRow } from 'vuetify/components';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/features/products/store';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseCheckbox from '@/components/atoms/BaseCheckbox.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
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
