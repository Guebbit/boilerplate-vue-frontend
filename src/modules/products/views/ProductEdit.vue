<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ProductEditPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Edit form for a product: fetches the ADMIN record (`GET /products/{id}/admin`, every language
 * the row has — never the public, single-language `GET /products/{id}`), populates one tab per
 * language it holds, and submits through the store's multipart-aware, merging `updateProduct`.
 * Removing a tab that existed on the fetched record sends `null` for that locale; removing one
 * opened this session and never saved just drops it — see `handleRemoveLocale`.
 */
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/modules/products/store';
import { productsSchema } from '@/modules/products/schemas.ts';
import { useActiveLocales } from '@/modules/products/composables/use-active-locales.ts';
import { useTranslatedEntityForm } from '@/modules/products/composables/use-translated-entity-form.ts';
import TranslationTabs from '@/ui/organisms/TranslationTabs.vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { Calendar, Clock, Hash, Languages, Package, Pencil } from 'lucide-vue-next';
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
    formatFlag,
    currencyDigits
} from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useStaleRecord } from '@/infrastructure/utils/use-stale-record.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import { useAxiosUploadProgress } from '@/ui/composables/use-axios-upload-progress.ts';
import { shopCurrency } from '@/infrastructure/shop-currency.ts';
import { toPatchTranslations } from '@/modules/products/composables/translations-body.ts';
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
 * Product identifier extracted from route params.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Product store's admin-record fetch and update actions.
 */
const { fetchProductAdmin, updateProduct } = useProductsStore();

/**
 * Router, asked whether the optional `EntityTranslations` route exists in this build.
 */
const router = useRouter();

/**
 * Session store, asked for the visitor's abilities.
 */
const session = useSessionStore();

/**
 * Whether the visitor may reach the generic translations screen — the same `translations.read`
 * the screen itself is gated on, asked of the server's own rules. A translations-only role would
 * hold it without ever being handed `products.manage`, and an unrestricted role holds it like
 * everything else — `editor`, the shipped role with `translations.manage`, also carries
 * `products.manage`, so it never exercises that distinction.
 *
 * `router.hasRoute` first, same pattern `AboutPage.vue` uses for its own module-optional links:
 * a build with no `EntityTranslations` route (the paired backend's
 * `locales` module is optional) must not throw trying to resolve a link to it.
 */
const mayViewTranslations = computed(
    () => router.hasRoute('EntityTranslations') && session.can('read', 'Translation')
);

/**
 * The deployment's active locales and fallback tag — what the tab bar offers to add.
 */
const { locales, fallbackLocale, fetchActiveLocales } = useActiveLocales();
void fetchActiveLocales();

/**
 * The fetched admin record: every language this product has a row for, plus its price/stock/
 * image — what this whole page renders from. `GET /products/{id}/admin` is deliberately
 * uncached, so this is a plain fetch rather than a `useStructureCrudApi` slice.
 */
const adminProduct = ref<Awaited<ReturnType<typeof fetchProductAdmin>>>();

/**
 * Whether the admin record is currently loading.
 */
const loadingAdmin = ref(false);

/**
 * (Re)loads the admin record for `id`.
 */
const loadAdminProduct = (productId: string) => {
    loadingAdmin.value = true;
    return fetchProductAdmin(productId)
        .then((data) => {
            adminProduct.value = data;
            return data;
        })
        .finally(() => {
            loadingAdmin.value = false;
        });
};

/**
 * Decimal places this product's own price field should accept — a KWD product can't round-trip
 * its third decimal through a 2-decimal input, and a JPY product would accept cents `toMinorUnits`
 * then silently rounds away server-side.
 */
const pricePrecision = computed(() =>
    currencyDigits(adminProduct.value?.currency ?? shopCurrency.value)
);

/**
 * Smallest increment the price input's stepper buttons move by, matching {@link pricePrecision}.
 */
const priceStep = computed(() => 10 ** -pricePrecision.value);

/**
 * Form definition. `translations` mirrors the write body's own shape
 * (`ProductTranslationsWrite`): an object upserts a locale, `null` deletes it, an absent key
 * leaves it untouched.
 */
interface ProductEditForm {
    price?: number;
    active?: boolean;
    requiresShipping?: boolean;
    noWithdrawal?: boolean;
    weight?: number;
    // `null` clears the class back to the shop's standard rate — always sent on submit, unlike
    // `translations`, which is the one field this PATCH merges instead of replacing.
    taxClass?: TaxClass | null;
    categories?: string[];
    tags?: string[];
    translations: ProductTranslationsWrite;
    imageUpload?: File;
}

/**
 * Validation schema of the edit form: price and per-locale translations required/validated,
 * replacement image optional. `translations` is `productsSchema`'s own rule, picked rather than
 * restated — see `schemas.ts`.
 */
const editSchema = productsSchema.pick({ price: true, translations: true }).extend({
    imageUpload: imageUploadSchema
});

/**
 * The `<form>` element, for scroll-to-first-invalid.
 */
const formElement = ref<HTMLFormElement>();

/**
 * This form's own blocked state — a save that failed blocks the visitor from proceeding past this
 * one submit button, so it renders through {@link InlineErrorAlert} next to it rather than a toast
 * — see docs/theory/request-flow.md.
 */
const {
    message: submitError,
    report: reportSubmitError,
    warn: warnSubmit,
    clear: clearSubmitError
} = useBlockingError();

/**
 * The save came back 412: someone else edited this product since it was loaded. The warning shows
 * through {@link submitError}; "reload latest" re-reads the admin record, which re-hydrates the
 * form and refreshes the `ETag` the next save sends (`infrastructure/http/etag.ts`).
 */
const {
    isStale,
    handle: handleStaleSave,
    reloadLatest,
    clear: clearStale
} = useStaleRecord({ warn: warnSubmit, clear: clearSubmitError }, () =>
    id ? loadAdminProduct(id) : Promise.resolve()
);

/**
 * Toolkit form state, language tabs and the failure tail, shared with the create form. A tab
 * removed from the fetched record goes out as `null`; one opened this session is just dropped.
 */
const {
    form,
    formErrors,
    showFormErrors,
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate,
    openTags,
    activeTab,
    tabErrorCounts,
    handleAddLocale,
    handleRemoveLocale,
    handleSubmitFailure
} = useTranslatedEntityForm<ProductEditForm>({
    initial: { translations: {} },
    schema: editSchema,
    formElement,
    fallbackLocale,
    stored: () => adminProduct.value?.translations,
    onStale: handleStaleSave,
    reportSubmitError
});

/**
 * Image upload progress, shown by `FormImageUpload` while a multipart save is in flight.
 */
const { progress: uploadProgress, trackUpload } = useAxiosUploadProgress();

/**
 * Auto-hydrate the form from the fetched admin record once it resolves.
 */
activateAutoHydrate(
    computed(() =>
        adminProduct.value
            ? {
                  price: adminProduct.value.price,
                  active: adminProduct.value.active ?? false,
                  requiresShipping: adminProduct.value.requiresShipping ?? true,
                  noWithdrawal: adminProduct.value.noWithdrawal ?? false,
                  weight: adminProduct.value.weight,
                  taxClass: adminProduct.value.taxClass ?? null,
                  // Fresh arrays too, same reason as `translations` below: a chip added then
                  // discarded via "Reset changes" must not have mutated the fetched record.
                  categories: [...(adminProduct.value.categories ?? [])],
                  tags: [...(adminProduct.value.tags ?? [])],
                  // Spread into a fresh object: the admin record's own `translations` must not be
                  // mutated by a later tab edit — `resetForm()` (the "Reset changes" button) needs
                  // it intact to hydrate from again.
                  translations: { ...adminProduct.value.translations }
              }
            : undefined
    )
);

/**
 * Loads the admin record whenever the route's product id changes, and resets the open tab: a
 * route change while this view stays mounted (editing product A, then B) must not leave B's form
 * open on whichever tab A happened to be on.
 */
watch(
    () => id,
    (productId) => {
        activeTab.value = undefined;
        if (productId) void loadAdminProduct(productId);
    },
    { immediate: true }
);

/**
 * Hero heading — the admin record's own resolved title, the route id while loading, or the
 * generic page title as a last resort.
 */
const heroTitle = computed(
    () => adminProduct.value?.title ?? id ?? t('product-edit-page.page-title')
);

/**
 * Hero subheading.
 */
const heroDescription = computed(() => formatText(adminProduct.value?.description));

/**
 * Validates the form and persists the product changes.
 *
 * @returns A promise resolving once the flow settles: a success toast and a fresh admin-record
 *  fetch (so a removed language's tab, and any server-resolved change, is reflected), or the
 *  revealed validation errors when the input is invalid. API failures block the form in place
 *  ({@link submitError}), with a per-language 422 also landing on the tab it names. A missing
 *  route id or price is a no-op.
 */
const submitForm = () => {
    clearSubmitError();
    clearStale();
    return handleSubmit(() => {
        const {
            price,
            active,
            requiresShipping,
            noWithdrawal,
            weight,
            taxClass,
            categories,
            tags,
            translations,
            imageUpload
        } = form.value;
        if (!id || price === undefined) return;
        // No baseline: the whole form is this save's intent. What the helper adds is the spelling —
        // a cleared weight or a blank translation description goes as the contract's `null`.
        return toRequestBody('UpdateProductByIdBody', {
            price,
            active,
            requiresShipping,
            noWithdrawal,
            weight,
            taxClass,
            categories,
            tags,
            translations: toPatchTranslations(translations)
        })
            .then((body) =>
                trackUpload(imageUpload, (options) =>
                    updateProduct(id, { ...body, imageUpload }, { requestOptions: options })
                )
            )
            .then(() => {
                // The API has answered with the stored `imageUrl` and the merged translations; the
                // admin record is the only place both live, so it is reloaded rather than patched by
                // hand — the store's own optimistic patch already skips `translations` for the same
                // reason (see `products/store.ts`).
                form.value.imageUpload = undefined;
                addMessage(t('product-edit-page.success-update'));
                // Discard the resolved admin record: `handleSubmit`'s callback must resolve `void`,
                // and the reload itself (not what it returns) is the point.
                return loadAdminProduct(id).then(() => undefined);
            });
    }).catch(handleSubmitFailure);
};
</script>

<template>
    <div id="product-edit-page">
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
                    :value="formatCurrency(adminProduct?.price, adminProduct?.currency ?? '')"
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('product-target-page.label-active')"
                    :value="
                        formatFlag(
                            adminProduct?.active,
                            t('generic.enabled'),
                            t('generic.disabled')
                        )
                    "
                    accent="tertiary"
                />
            </template>

            <CardDetail>
                <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('generic.details') }}</h3>
                        <p class="mt-1 opacity-75">{{ t('product-edit-page.page-title') }}</p>
                    </div>
                    <v-btn
                        v-if="id && mayViewTranslations"
                        variant="tonal"
                        data-test="translations-link"
                        :to="
                            routerLinkI18n({
                                name: 'EntityTranslations',
                                params: { entityType: 'product', id }
                            })
                        "
                    >
                        <Languages :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('product-edit-page.button-translations') }}
                    </v-btn>
                </div>

                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
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
                        `form.translations[tag]!` — every open tab's slot is either the admin
                        record's own row (an object) or freshly seeded by `handleAddLocale` (also
                        an object); `null` only ever lands on a tab CLOSED by `handleRemoveLocale`,
                        which also removes it from `openTags` in the same call.
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
                                :label="t('product-edit-page.label-title')"
                                :error-messages="
                                    showFormErrors && !form.translations[tag]?.title
                                        ? [t('products-form.title-required')]
                                        : []
                                "
                                data-test="translation-title-field"
                            />
                            <v-textarea
                                v-model="form.translations[tag]!.description"
                                :label="t('product-edit-page.label-description')"
                                :rows="5"
                                data-test="translation-description-field"
                            />
                        </v-window-item>
                    </v-window>

                    <v-number-input
                        v-model="form.price"
                        :label="t('product-edit-page.label-price')"
                        :min="0"
                        :step="priceStep"
                        :precision="pricePrecision"
                        control-variant="stacked"
                        :error-messages="showFormErrors ? formErrors.price : []"
                        data-test="product-price-field"
                    />
                    <v-number-input
                        v-model="form.weight"
                        :label="t('product-edit-page.label-weight')"
                        :min="0"
                        :step="1"
                        :precision="0"
                        control-variant="stacked"
                        :hint="
                            form.weight === undefined || form.weight === null
                                ? t('product-edit-page.hint-weight-missing')
                                : undefined
                        "
                        persistent-hint
                        data-test="product-weight-field"
                    />
                    <v-select
                        v-model="form.taxClass"
                        :label="t('product-edit-page.label-tax-class')"
                        :items="[
                            { title: t('product-edit-page.tax-class-standard'), value: null },
                            {
                                title: t('product-edit-page.tax-class-reduced'),
                                value: 'reduced'
                            },
                            { title: t('product-edit-page.tax-class-zero'), value: 'zero' }
                        ]"
                        data-test="product-tax-class-field"
                    />
                    <v-combobox
                        v-model="form.categories"
                        multiple
                        chips
                        closable-chips
                        :label="t('product-edit-page.label-categories')"
                        data-test="product-categories-field"
                    />
                    <v-combobox
                        v-model="form.tags"
                        multiple
                        chips
                        closable-chips
                        :label="t('product-edit-page.label-tags')"
                        data-test="product-tags-field"
                    />
                    <v-switch
                        v-model="form.active"
                        :label="t('product-edit-page.label-active')"
                        data-test="product-active-field"
                    />
                    <v-switch
                        v-model="form.requiresShipping"
                        :label="t('product-edit-page.label-requires-shipping')"
                        data-test="product-requires-shipping-field"
                    />
                    <v-switch
                        v-model="form.noWithdrawal"
                        :label="t('product-edit-page.label-no-withdrawal')"
                        :hint="t('product-edit-page.hint-no-withdrawal')"
                        persistent-hint
                        data-test="product-no-withdrawal-field"
                    />
                    <FormImageUpload
                        v-model="form.imageUpload"
                        :current-image-url="adminProduct?.imageUrl"
                        :error-messages="showFormErrors ? formErrors.imageUpload : []"
                        :progress="uploadProgress"
                        :disabled="isSubmitting"
                    />

                    <InlineErrorAlert
                        :message="submitError"
                        :type="isStale ? 'warning' : 'error'"
                        data-test="product-edit-submit-error"
                    />

                    <v-btn
                        v-if="isStale"
                        variant="tonal"
                        color="warning"
                        data-test="product-edit-reload-latest"
                        :loading="loadingAdmin"
                        @click="reloadLatest"
                    >
                        {{ t('generic.action-reload-latest') }}
                    </v-btn>

                    <div class="flex flex-wrap gap-2">
                        <v-btn
                            type="submit"
                            color="primary"
                            :disabled="isSubmitting || loadingAdmin"
                        >
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
                    <CardInfo :title="heroTitle" :description="heroDescription" accent="primary">
                        <template #icon><Package :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('product-target-page.label-id')"
                        :value="id ?? EMPTY_VALUE"
                        :icon="Hash"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-created-at')"
                        :value="formatDateTime(adminProduct?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-updated-at')"
                        :value="formatDateTime(adminProduct?.updatedAt)"
                        :icon="Clock"
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
    </div>
</template>
