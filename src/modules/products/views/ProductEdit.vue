<script lang="ts">
export default {
    name: 'ProductEditPage'
};
</script>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/routerLink.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/modules/products/store';
import { productsSchema } from '@/modules/products/schemas.ts';
import { z } from 'zod';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Package, Pencil } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    EMPTY_VALUE,
    formatText,
    formatDateTime,
    formatCurrency,
    formatFlag
} from '@/infrastructure/utils/formatters.ts';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import { useUploadProgress } from '@/infrastructure/composables/useUploadProgress.ts';

/**
 * Generic i18n and notification helpers.
 */
const { t, locale } = useI18n();
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
const { watchProduct, updateProduct } = useProductsStore();
const { currentProduct, loading } = storeToRefs(useProductsStore());

/**
 * Form model used by the update workflow.
 */
interface ProductEditForm {
    title?: string;
    price?: number;
    description?: string;
    active?: boolean;
    imageUpload?: File;
}

/**
 * Validation schema of the edit form: title and price required, description, active flag and
 * replacement image optional.
 *
 * Built once. Its messages are thunks resolved at parse time, so it speaks the active language
 * without being rebuilt — see `@/modules/users/schemas.ts`.
 */
const editSchema = productsSchema.pick({ title: true, price: true }).extend({
    description: z.string().optional(),
    active: z.boolean().optional(),
    imageUpload: imageUploadSchema
});

/**
 * Toolkit form state and submit handler.
 */
const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors,
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate,
    applyServerErrors
} = useStructureFormValidation<ProductEditForm>({}, editSchema, {
    revalidateOn: locale,
    // The toolkit reveals the errors, waits for the render and focuses the first invalid field.
    formElement,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('users-form.fix-errors'))
});

/**
 * Image upload progress, shown by `FormImageUpload` while a multipart save is in flight.
 */
const { uploadProgress, trackUpload } = useUploadProgress();

/**
 * Auto-hydrate the form from the fetched record once it resolves.
 */
activateAutoHydrate(
    computed(() =>
        currentProduct.value
            ? {
                  title: currentProduct.value.title ?? '',
                  price: currentProduct.value.price ?? 0,
                  description: currentProduct.value.description ?? '',
                  active: currentProduct.value.active ?? false
              }
            : undefined
    )
);

/**
 * Hero heading.
 *
 * @returns The loaded product title, the route id while loading, or the generic
 *  page title as a last resort.
 */
const heroTitle = computed(
    () => currentProduct.value?.title ?? id ?? t('product-edit-page.page-title')
);

/**
 * Hero subheading.
 *
 * @returns The product description, or the empty-value glyph when blank.
 */
const heroDescription = computed(() => formatText(currentProduct.value?.description));

/**
 * Validates the form and persists the product changes.
 *
 * @returns A promise resolving once the flow settles: a success toast, or the
 *  revealed validation errors when the input is invalid. API failures surface as
 *  a toast. A missing route id, title or price is a no-op.
 */
const submitForm = () =>
    handleSubmit(() => {
        // Read out before the callback below: TypeScript's narrowing of `form.value.title` from
        // the guard does not survive into a closure, since `form` is a mutable ref.
        const { title, price, description, active, imageUpload } = form.value;
        if (!id || title === undefined || price === undefined) return;
        return trackUpload(imageUpload, (options) =>
            updateProduct(
                id,
                {
                    title,
                    price,
                    description: description || undefined,
                    active,
                    imageUpload
                },
                options
            )
        ).then(() => {
            // The API has answered with the stored `imageUrl`, which the store merged into
            // `currentProduct`; dropping the local File hands the preview back to the served
            // image and stops a second save re-uploading the same bytes.
            form.value.imageUpload = undefined;
            addMessage(t('product-edit-page.success-update'));
        });
    }).catch((error) => {
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });

/**
 * Selects and (re)fetches the product whenever the route id changes.
 */
watchProduct(() => id);
</script>

<template>
    <LayoutDefault id="product-edit-page" :title="t('product-edit-page.page-title')">
        <ItemDetailLayout accent="primary">
            <template #hero>
                <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                    <template #icon><Pencil :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('product-target-page.label-id')"
                    :value="id ?? EMPTY_VALUE"
                />
                <CardMaterialStat
                    :title="t('product-target-page.label-price')"
                    :value="formatCurrency(currentProduct?.price)"
                    accent="secondary"
                />
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
            </template>

            <CardDetail>
                <div class="mb-5">
                    <h3 class="text-lg font-semibold">{{ t('generic.details') }}</h3>
                    <p class="mt-1 opacity-75">{{ t('product-edit-page.page-title') }}</p>
                </div>

                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
                >
                    <v-text-field
                        v-model="form.title"
                        type="text"
                        :label="t('product-edit-page.label-title')"
                        :error-messages="showFormErrors ? formErrors.title : []"
                    />
                    <v-number-input
                        v-model="form.price"
                        :label="t('product-edit-page.label-price')"
                        :min="0"
                        :step="0.01"
                        :precision="2"
                        control-variant="stacked"
                        :error-messages="showFormErrors ? formErrors.price : []"
                    />
                    <v-textarea
                        v-model="form.description"
                        :label="t('product-edit-page.label-description')"
                        :rows="5"
                    />
                    <v-switch v-model="form.active" :label="t('product-edit-page.label-active')" />
                    <FormImageUpload
                        v-model="form.imageUpload"
                        :current-image-url="currentProduct?.imageUrl"
                        :error-messages="showFormErrors ? formErrors.imageUpload : []"
                        :progress="uploadProgress"
                        :disabled="isSubmitting"
                    />

                    <div class="flex flex-wrap gap-2">
                        <v-btn type="submit" color="primary" :disabled="isSubmitting || loading">
                            {{ t('product-edit-page.button-submit') }}
                        </v-btn>
                        <v-btn variant="tonal" @click="resetForm">
                            {{ t('product-edit-page.reset-form') }}
                        </v-btn>
                    </div>
                </form>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="primary">
                        <template #icon><Package :size="28" /></template>
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
            </template>

            <template #actions>
                <v-btn
                    v-if="id"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'ProductTarget', params: { id } })"
                >
                    {{ t('product-edit-page.button-go-to-details') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'ProductsList' })">
                    {{ t('product-edit-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
