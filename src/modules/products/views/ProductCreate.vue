<script lang="ts">
export default {
    name: 'ProductCreatePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Create form for a product: one language tab per active locale (the fallback locale's first and
 * always open), builds the `translations` map `POST /products` expects, and submits through the
 * store's multipart-aware `createProduct`. See `translation-tab-errors.ts` for how a validation
 * failure reaches the right tab's badge.
 */
import { ref, watch } from 'vue';
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
import { useActiveLocales } from '@/modules/products/composables/use-active-locales.ts';
import {
    translationTabErrorCountsFromZodError,
    translationTabErrorCountsFromServerError
} from '@/modules/products/composables/translation-tab-errors.ts';
import { useTranslationTabOrder } from '@/ui/composables/use-translation-tab-order.ts';
import TranslationTabs from '@/ui/organisms/TranslationTabs.vue';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormCard from '@/ui/organisms/FormCard.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import type { ProductTranslationsWrite } from '@types';

/**
 * Localized dictionary helper, with the active locale reference used to revalidate the form.
 *
 * The APP's interface language, unrelated to which language TAB is open below — an editor writing
 * Italian product copy while using an English admin is the normal case.
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
 * The deployment's active locales and fallback tag — what the tab bar offers.
 */
const { locales, fallbackLocale, fetchActiveLocales } = useActiveLocales();
void fetchActiveLocales();

/**
 * Form definition. `translations` mirrors the write body's own shape (`ProductTranslationsWrite`)
 * rather than a bespoke per-field record, so no conversion happens between what the form holds
 * and what the store sends.
 */
interface ProductCreateForm {
    price?: number;
    active?: boolean;
    translations: ProductTranslationsWrite;
    imageUpload?: File;
}

/**
 * Built once: the messages inside are thunks, resolved in the active language at parse time —
 * see `@/modules/users/schemas.ts`. `translations` is `productsSchema`'s own per-locale rule,
 * picked rather than restated.
 */
const createSchema = productsSchema.pick({ price: true, translations: true }).extend({
    imageUpload: imageUploadSchema
});

const card = ref<InstanceType<typeof FormCard>>();

/**
 * Toolkit form state and submit handler. `price` starts at 0 — the contract's own minimum — so
 * the field opens already valid instead of an error waiting to be revealed.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<ProductCreateForm>(
    { price: 0, active: true, translations: {} },
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
 * Which language tabs are open, fallback locale first — derived from `form.translations` itself
 * (every present, non-`null` key) rather than tracked separately, so a `resetForm()` cannot leave
 * the tab bar out of sync with the data it is supposed to reflect.
 */
const openTags = useTranslationTabOrder(() => form.value.translations, fallbackLocale);

/**
 * The tab currently shown.
 */
const activeTab = ref<string>();

/**
 * Seeds the fallback locale's tab once it is known, and defaults the active tab to the first one
 * open. The fallback slot is never removed on a create — a product with nothing to fall back to
 * cannot be created at all — so this only ever ADDS the key, never re-checks it later.
 */
watch(
    fallbackLocale,
    (fallback) => {
        if (!fallback || fallback in form.value.translations) return;
        form.value.translations = {
            ...form.value.translations,
            [fallback]: { title: '', description: '' }
        };
        activeTab.value ??= fallback;
    },
    { immediate: true }
);

/**
 * Opens a new, empty language tab.
 *
 * @param tag - The locale to open.
 */
const handleAddLocale = (tag: string) => {
    form.value.translations = { ...form.value.translations, [tag]: { title: '', description: '' } };
    activeTab.value = tag;
};

/**
 * Drops a language tab. A create has nothing stored server-side yet, so this simply removes the
 * key — unlike an edit's removal, it never becomes a `null` slot.
 *
 * @param tag - The locale to close. The fallback tag is never offered this action (see
 *  `TranslationTabs`), so it is never reached here either.
 */
const handleRemoveLocale = (tag: string) => {
    const { [tag]: _removed, ...rest } = form.value.translations;
    form.value.translations = rest;
    if (activeTab.value === tag) activeTab.value = openTags.value[0];
};

/**
 * Per-locale error counts for the tab badges — computed independently of
 * `useStructureFormValidation`'s own `formErrors`, which collapses every `translations.*` issue
 * into one flat bucket (see `translation-tab-errors.ts`). Only populated once a submit has
 * revealed errors, so a pristine form shows no badges.
 */
const tabErrorCounts = ref<Record<string, number>>({});

watch(
    [showErrors, () => form.value],
    ([showing]) => {
        if (!showing) {
            tabErrorCounts.value = {};
            return;
        }
        const result = createSchema.safeParse(form.value);
        tabErrorCounts.value = result.success
            ? {}
            : translationTabErrorCountsFromZodError(result.error);
    },
    { deep: true }
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
 *  are revealed; API failures are reported as toasts, with a per-language 422 also
 *  landing on the tab it names.
 */
const submitForm = () =>
    handleSubmit(() =>
        trackUpload(form.value.imageUpload, (options) =>
            createProduct(
                {
                    price: form.value.price!,
                    active: form.value.active,
                    translations: form.value.translations,
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
    ).catch((error) => {
        const serverTabErrors = translationTabErrorCountsFromServerError(error);
        if (Object.keys(serverTabErrors).length > 0)
            tabErrorCounts.value = { ...tabErrorCounts.value, ...serverTabErrors };
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
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
            <TranslationTabs
                v-model="activeTab"
                :locales="locales"
                :open-tags="openTags"
                :fallback-tag="fallbackLocale"
                :error-counts="tabErrorCounts"
                @add="handleAddLocale"
                @remove="handleRemoveLocale"
            />

            <!--
                `form.translations[tag]!` — `tag` always comes from `openTags`, and every open
                tag's slot is seeded as an object by `handleAddLocale`/the fallback watcher above;
                a create never puts `null` there (that signal only exists on the merging PATCH).
            -->
            <v-window v-model="activeTab">
                <v-window-item
                    v-for="tag in openTags"
                    :key="tag"
                    :value="tag"
                    :id="`translation-panel-${tag}`"
                    role="tabpanel"
                    :aria-labelledby="`translation-tab-${tag}`"
                >
                    <v-text-field
                        v-model="form.translations[tag]!.title"
                        type="text"
                        :label="t('product-create-page.label-title')"
                        :error-messages="
                            showErrors && !form.translations[tag]?.title
                                ? [t('products-form.title-required')]
                                : []
                        "
                        data-test="translation-title-field"
                        class="mb-2"
                    />
                    <v-textarea
                        v-model="form.translations[tag]!.description"
                        :label="t('product-create-page.label-description')"
                        :rows="5"
                        data-test="translation-description-field"
                    />
                </v-window-item>
            </v-window>

            <v-number-input
                v-model="form.price"
                :label="t('product-create-page.label-price')"
                :min="0"
                :step="0.01"
                :precision="2"
                control-variant="stacked"
                :error-messages="showErrors ? formErrors.price : []"
                data-test="product-price-field"
                class="mb-2 mt-4"
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
