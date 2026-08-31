<script lang="ts">
export default {
    name: 'ProductCreatePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Create form for a product: builds a picked/extended slice of the shared products schema, wires
 * it to `useStructureFormValidation`, and submits through the store's multipart-aware `createProduct`.
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import {
    useNotificationsStore,
    useStructureFormValidation,
    useUploadProgress as useToolkitUploadProgress
} from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/modules/products/store';
import { productsSchema } from '@/modules/products/schemas.ts';
import { z } from 'zod';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormCard from '@/ui/organisms/FormCard.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

/**
 * Localized dictionary helper, with the active locale reference used to revalidate the form.
 */
const { t, locale } = useI18n();

/**
 * Toast helper for submission failures.
 */
const { addMessage } = useNotificationsStore();

/**
 * Router instance, used to navigate to the new product's detail page after creation.
 */
const router = useRouter();

/**
 * Products store's create action.
 */
const { createProduct } = useProductsStore();

/**
 * Form definition
 */
interface ProductCreateForm {
    title?: string;
    price?: number;
    description?: string;
    active?: boolean;
    imageUpload?: File;
}

/**
 * Built once: the messages inside are thunks, resolved in the active language at parse time —
 * see `@/modules/users/schemas.ts`.
 *
 * The same `title`/`price` rules the edit form uses, from the same `productsSchema`, so the two
 * screens cannot disagree about what a valid product is.
 */
const createSchema = productsSchema.pick({ title: true, price: true }).extend({
    description: z.string().optional(),
    active: z.boolean().optional(),
    imageUpload: imageUploadSchema
});

/**
 * Every field is seeded, and the empty string for `title` is not cosmetic.
 *
 * A field left `undefined` fails `z.string()` on its TYPE, and zod answers that with its own
 * built-in "Invalid input: expected string, received undefined" — in English, whatever the active
 * locale, because the schema's thunked message belongs to the `.min(1)` check the value never
 * reaches. Seeding `''` means an untouched field fails the length rule instead, which is the one
 * that speaks the user's language and says something useful.
 *
 * `price` starts at 0 for the same reason plus one more: the contract's minimum is 0, so the
 * starting value is already valid rather than an error waiting to be revealed.
 */
const card = ref<InstanceType<typeof FormCard>>();

/**
 * Toolkit form state and submit handler.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit
} = useStructureFormValidation<ProductCreateForm>(
    { title: '', price: 0, description: '', active: true },
    createSchema,
    {
        // The `<form>` lives in `FormCard`; read through a getter so the element is resolved when a
        // failed submit actually needs it, not while the card is still mounting.
        formElement: () => card.value?.formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * Image upload progress, shown by `FormImageUpload` while the multipart create is in flight.
 */
const { progress: uploadProgress, track } = useToolkitUploadProgress<AxiosRequestConfig>(
    (onProgress) => ({
        // `event.progress` is a 0–1 fraction, absent when the total size is unknown (a chunked or
        // compressed request) — reporting 0 keeps the bar still rather than jumping about.
        onUploadProgress: (event: AxiosProgressEvent) => onProgress(event.progress ?? 0)
    })
);

/**
 * Runs an API call with upload progress attached, and returns to idle however it ends.
 */
const trackUpload = <T,>(
    file: File | undefined,
    send: (options?: AxiosRequestConfig) => Promise<T>
) => track(send, { enabled: !!file });

/**
 * Validates the form and creates the product.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the new product's detail page is opened; on invalid input the errors
 *  are revealed; API failures are reported as toasts.
 */
const submitForm = () =>
    handleSubmit(() =>
        trackUpload(form.value.imageUpload, (options) =>
            createProduct(
                {
                    title: form.value.title!,
                    price: form.value.price!,
                    description: form.value.description || undefined,
                    active: form.value.active,
                    imageUpload: form.value.imageUpload
                },
                options
            )
        ).then((newProduct) => {
            if (!newProduct) return;
            addMessage(t('product-create-page.success-create'));
            // Fire-and-forget: a NavigationFailure must not convert a completed create into an error toast.
            void router.push(
                routerLinkI18n({ name: 'ProductTarget', params: { id: newProduct.id } })
            );
        })
    ).catch((error) => notifyErrorMessages(addMessage, error));
</script>

<template>
    <LayoutDefault id="product-create-page" :title="t('product-create-page.page-title')">
        <FormCard
            ref="card"
            :submit-label="t('product-create-page.button-submit')"
            :back-to="{ name: 'ProductsList' }"
            :back-label="t('product-create-page.button-go-to-list')"
            :loading="isSubmitting"
            @submit="submitForm"
        >
            <v-text-field
                v-model="form.title"
                type="text"
                :label="t('product-create-page.label-title')"
                :error-messages="showErrors ? formErrors.title : []"
                class="mb-2"
            />
            <v-number-input
                v-model="form.price"
                :label="t('product-create-page.label-price')"
                :min="0"
                :step="0.01"
                :precision="2"
                control-variant="stacked"
                :error-messages="showErrors ? formErrors.price : []"
                class="mb-2"
            />
            <v-textarea
                v-model="form.description"
                :label="t('product-create-page.label-description')"
                :rows="5"
            />
            <FormImageUpload
                v-model="form.imageUpload"
                :error-messages="showErrors ? formErrors.imageUpload : []"
                :progress="uploadProgress"
                :disabled="isSubmitting"
                class="mt-2"
            />
            <v-switch v-model="form.active" :label="t('product-create-page.label-active')" />
        </FormCard>
    </LayoutDefault>
</template>
