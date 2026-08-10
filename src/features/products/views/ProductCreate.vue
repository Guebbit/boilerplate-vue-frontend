<template>
    <LayoutDefault id="product-create-page" :title="t('product-create-page.page-title')">
        <v-card class="mx-auto mt-10 w-full max-w-xl p-8">
            <form novalidate @submit.prevent="submitForm">
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
                <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="isSubmitting"
                    class="mt-2"
                >
                    {{ t('product-create-page.button-submit') }}
                </v-btn>
            </form>
            <div class="mt-4 flex justify-center">
                <v-btn variant="text" :to="routerLinkI18n({ name: 'ProductsList' })">
                    {{ t('product-create-page.button-go-to-list') }}
                </v-btn>
            </div>
        </v-card>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductCreatePage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/features/products/store';
import { productsSchema } from '@/features/products/schemas.ts';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import FormImageUpload from '@/components/molecules/FormImageUpload.vue';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { imageUploadSchema, useUploadProgress } from '@/utils/uploads.ts';

/**
 * Generics
 */
const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();

/**
 * Products store
 */
const { createProduct } = useProductsStore();

/**
 * Form definition
 */
interface IProductCreateForm {
    title?: string;
    price?: number;
    description?: string;
    active?: boolean;
    imageUpload?: File;
}

/**
 * Built once: the messages inside are thunks, resolved in the active language at parse time —
 * see `@/features/users/schemas.ts`.
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
const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IProductCreateForm>(
        { title: '', price: 0, description: '', active: true },
        createSchema,
        {
            revalidateOn: locale
        }
    );

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);

/**
 * Image upload progress, shown by `FormImageUpload` while the multipart create is in flight.
 */
const { uploadProgress, trackUpload } = useUploadProgress();

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
            router.push(routerLinkI18n({ name: 'ProductTarget', params: { id: newProduct.id } }));
        })
    )
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>
