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
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/modules/products/store';
import {
    productsSchema,
    productsOnHandMin,
    productsOnHandDefault
} from '@/modules/products/schemas.ts';
import { useActiveLocales } from '@/modules/products/composables/use-active-locales.ts';
import { useTranslatedEntityForm } from '@/modules/products/composables/use-translated-entity-form.ts';
import TranslationTabs from '@/ui/organisms/TranslationTabs.vue';
import FormCard from '@/ui/organisms/FormCard.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import { useAxiosUploadProgress } from '@/ui/composables/use-axios-upload-progress.ts';
import { toCreateTranslations } from '@/modules/products/composables/translations-body.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';
import { currencyDigits } from '@/infrastructure/utils/formatters.ts';
import { loadShopCurrency, shopCurrency } from '@/infrastructure/shop-currency.ts';
import type { ProductTranslationsWrite } from '@types';
import type { TaxClass } from '@api';

/**
 * Localized dictionary helper.
 */
const { t } = useI18n();

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
    requiresShipping?: boolean;
    noWithdrawal?: boolean;
    weight?: number;
    // Absent means the shop's standard rate; an edit sends `null` for the same meaning, but a
    // create simply omits the key rather than declaring a clear that has nothing to clear yet.
    taxClass?: TaxClass;
    // Create-only: the opening stock count. An edit never carries this field — every later change
    // to stock goes through `/inventory`'s signed transitions instead.
    onHand?: number;
    categories?: string[];
    tags?: string[];
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
 * This form's own blocked state — a create that failed blocks the visitor from proceeding past
 * this one submit button, so it renders through {@link InlineErrorAlert} next to it rather than a
 * toast — see docs/theory/request-flow.md.
 */
const {
    message: submitError,
    report: reportSubmitError,
    clear: clearSubmitError
} = useBlockingError();

/**
 * Toolkit form state, language tabs and the failure tail, shared with the edit form. `price`
 * starts at 0 — the contract's own minimum — so the field opens already valid instead of an error
 * waiting to be revealed. The fallback locale's tab is seeded once it is known: a product with
 * nothing to fall back to cannot be created at all.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit,
    openTags,
    activeTab,
    tabErrorCounts,
    handleAddLocale,
    handleRemoveLocale,
    handleSubmitFailure
} = useTranslatedEntityForm<ProductCreateForm>({
    initial: {
        price: 0,
        active: true,
        requiresShipping: true,
        noWithdrawal: false,
        onHand: productsOnHandDefault,
        translations: {}
    },
    schema: createSchema,
    // The `<form>` lives in `FormCard`; read through a getter so the element is resolved when a
    // failed submit actually needs it, not while the card is still mounting.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof FormCard>), even with `formElement` explicitly exposed via FormCard.vue's own defineExpose
    formElement: () => card.value?.formElement,
    fallbackLocale,
    seedFallback: true,
    reportSubmitError
});

/**
 * The shop's currency decides how many decimals the price input takes: a JPY shop has no cents to
 * type, a KWD shop has three. Asked here as well as at boot, so a failed boot read is retried.
 */
void loadShopCurrency();

/**
 * Decimal places the price field accepts — the shop currency's own minor unit.
 */
const pricePrecision = computed(() => currencyDigits(shopCurrency.value));

/**
 * Smallest increment the price input's stepper buttons move by, matching {@link pricePrecision}.
 */
const priceStep = computed(() => 10 ** -pricePrecision.value);

/**
 * Image upload progress, shown by `FormImageUpload` while the multipart create is in flight.
 */
const { progress: uploadProgress, trackUpload } = useAxiosUploadProgress();

/**
 * Validates the form and creates the product.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the new product's detail page is opened; on invalid input the errors
 *  are revealed; API failures block the form in place ({@link submitError}), with a
 *  per-language 422 also landing on the tab it names.
 */
const submitForm = () => {
    clearSubmitError();
    return handleSubmit(() => {
        const { imageUpload, translations, price } = form.value;
        if (price === undefined) return;
        // No baseline: a create sends everything the form holds. What the helper adds is the
        // spelling — a cleared weight or category list is omitted rather than sent empty — and a
        // blank description is dropped from each locale (`toCreateTranslations`).
        return toRequestBody('CreateProductBody', {
            ...form.value,
            translations: toCreateTranslations(translations),
            imageUpload: undefined
        })
            .then((body) =>
                trackUpload(imageUpload, (options) =>
                    createProduct({ ...body, imageUpload }, { requestOptions: options })
                )
            )
            .then((newProduct) => {
                if (!newProduct) return;
                addMessage(t('product-create-page.success-create'));
                // Fire-and-forget: a NavigationFailure must not convert a completed create into an error toast.
                void router.push(
                    routerLinkI18n({ name: 'ProductTarget', params: { id: newProduct.id } })
                );
            });
    }).catch(handleSubmitFailure);
};
</script>

<template>
    <div id="product-create-page">
        <!--
            No form until the language manifest has landed. `GET /locales` names the fallback
            locale, and the watcher above seeds ITS tab — so until both have happened the form has
            a submit button and no title field, and `translations` is an empty map. An empty map is
            valid to `productsSchema` on purpose (a merging PATCH with no languages means "change
            nothing"), so nothing client-side stops a submit, and the API answers 422 "the en
            translation is required" — a refusal the user cannot act on, under a field that is not
            on screen yet.
        -->
        <v-skeleton-loader v-if="openTags.length === 0" type="article, actions" />
        <FormCard
            v-else
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
                :step="priceStep"
                :precision="pricePrecision"
                control-variant="stacked"
                :suffix="shopCurrency"
                :error-messages="showErrors ? formErrors.price : []"
                data-test="product-price-field"
                class="mb-2 mt-4"
            />
            <v-number-input
                v-model="form.weight"
                :label="t('product-create-page.label-weight')"
                :min="0"
                :step="1"
                :precision="0"
                control-variant="stacked"
                :hint="
                    form.weight === undefined
                        ? t('product-create-page.hint-weight-missing')
                        : undefined
                "
                persistent-hint
                data-test="product-weight-field"
                class="mb-2"
            />
            <v-select
                v-model="form.taxClass"
                :label="t('product-create-page.label-tax-class')"
                :items="[
                    { title: t('product-create-page.tax-class-standard'), value: undefined },
                    { title: t('product-create-page.tax-class-reduced'), value: 'reduced' },
                    { title: t('product-create-page.tax-class-zero'), value: 'zero' }
                ]"
                data-test="product-tax-class-field"
                class="mb-2"
            />
            <!--
                Create-only: opening stock. An edit never shows this field, since every later
                stock change goes through /inventory's signed transitions instead.
            -->
            <v-number-input
                v-model="form.onHand"
                :label="t('product-create-page.label-on-hand')"
                :min="productsOnHandMin"
                :step="1"
                :precision="0"
                control-variant="stacked"
                data-test="product-on-hand-field"
                class="mb-2"
            />
            <v-combobox
                v-model="form.categories"
                multiple
                chips
                closable-chips
                :label="t('product-create-page.label-categories')"
                data-test="product-categories-field"
                class="mb-2"
            />
            <v-combobox
                v-model="form.tags"
                multiple
                chips
                closable-chips
                :label="t('product-create-page.label-tags')"
                data-test="product-tags-field"
                class="mb-2"
            />
            <FormImageUpload
                v-model="form.imageUpload"
                :error-messages="showErrors ? formErrors.imageUpload : []"
                :progress="uploadProgress"
                :disabled="isSubmitting"
                class="mt-2"
            />
            <v-switch v-model="form.active" :label="t('product-create-page.label-active')" />
            <v-switch
                v-model="form.requiresShipping"
                :label="t('product-create-page.label-requires-shipping')"
                data-test="product-requires-shipping-field"
            />
            <v-switch
                v-model="form.noWithdrawal"
                :label="t('product-create-page.label-no-withdrawal')"
                :hint="t('product-create-page.hint-no-withdrawal')"
                persistent-hint
                data-test="product-no-withdrawal-field"
            />

            <InlineErrorAlert :message="submitError" data-test="product-create-submit-error" />
        </FormCard>
    </div>
</template>
