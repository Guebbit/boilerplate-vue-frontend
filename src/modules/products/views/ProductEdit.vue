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
 * Edit form for a product: fetches `GET /products/{id}`, whose `source` (the default-language text)
 * and `translations` (the other languages) the API sends to a caller holding `read:Translation`,
 * populates one tab per language, and submits through the store's multipart-aware, merging
 * `updateProduct`.
 * Removing a tab that existed on the fetched record sends `null` for that locale; removing one
 * opened this session and never saved just drops it — see `handleRemoveLocale`.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { getCurrentLocale } from '@/i18n';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useMissingRecord } from '@/infrastructure/utils/use-missing-record.ts';
import { useLeaveGuard } from '@/ui/composables/use-leave-guard.ts';
import { holdWhileSubmitting } from '@/ui/composables/use-hold-while-submitting.ts';
import { useSlot } from '@/kernel/slots';
import { availabilityOf } from '@/kernel/availability.ts';
import { useProductsStore } from '../store';
import { productsSchema } from '../schemas.ts';
import { useTranslatedEntityForm } from '../composables/use-translated-entity-form.ts';
import TranslationTabs from '@/ui/organisms/TranslationTabs.vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { Calendar, Clock, Hash, Languages, Package, Pencil } from 'lucide-vue-next';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import RecordAsideCard from '@/ui/organisms/RecordAsideCard.vue';
import type { DetailFieldRow } from '@/ui/types.ts';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    EMPTY_VALUE,
    formatText,
    formatDateTime,
    formatCurrency,
    formatFlag
} from '@/infrastructure/utils/formatters.ts';
import { decimalScale, normalizeAmount, padDecimal } from '@/infrastructure/utils/money.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useStaleRecord } from '@/infrastructure/utils/use-stale-record.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import { useAxiosUploadProgress } from '@/ui/composables/use-axios-upload-progress.ts';
import { backorderPromiseDays } from '@/modules/shop';
import { toFormTranslations, toPatchFields } from '../translations-body.ts';
import { dayChange } from '../release-date.ts';
import { useReleaseDateConfirm } from '../composables/use-release-date-confirm.ts';
import type { ProductTranslationsWrite, TaxClass } from '@types';

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
const { fetchProductForEdit, updateProduct } = useProductsStore();

/**
 * The availability watcher `inventory` contributes: whether the product is a preorder right now,
 * which the release-date hint says, is the server's `availability`, read fresh (`staleTime` 0)
 * since a release date passes without any edit. A slot because `inventory` owns the read
 * (`@/kernel/availability`).
 */
const availabilityWatchers = useSlot('availability-watch');

/**
 * The product id as the watcher takes it.
 */
const watchedIds = computed(() => (id ? [id] : []));

/**
 * Whether the admin record is currently loading.
 */
const { loadingProductForEdit: loadingAdmin } = storeToRefs(useProductsStore());

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
const { translationLocales: locales, translationFallbackLocale: fallbackLocale } =
    storeToRefs(useProductsStore());

const { fetchTranslationLocales } = useProductsStore();

// eslint-disable-next-line @typescript-eslint/no-floating-promises -- fetchTranslationLocales never rejects (it falls back to the shop languages)
void fetchTranslationLocales();

/**
 * The fetched record: every language this product has a row for (`translations`), plus its
 * price/stock/image — what this whole page renders from. Read uncached, so this is a plain fetch
 * rather than a `useStructureCrudApi` slice.
 */
const adminProduct = ref<Awaited<ReturnType<typeof fetchProductForEdit>>>();

/**
 * (Re)loads the admin record for `id`.
 */
const loadAdminProduct = (productId: string) =>
    fetchProductForEdit(productId).then((data) => {
        adminProduct.value = data;
        return data;
    });

/**
 * Form definition. `translations` mirrors the write body's own shape
 * (`ProductTranslationsWrite`): an object upserts a locale, `null` deletes it, an absent key
 * leaves it untouched.
 */
interface ProductEditForm {
    price?: string;
    active?: boolean;
    purchasable?: boolean;
    // The `datetime-local` input's own string (`''` = no date), converted on submit.
    releaseDate?: string;
    // Keep selling while out of stock, and when stock is expected back (`''` = no date).
    allowBackorder?: boolean;
    restockDate?: string;
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
    isDirty,
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
 * Warns before a half-typed form is lost to a navigation; `markSaved` lifts it for a save.
 */
const { markSaved } = useLeaveGuard(isDirty, () => session.isAuth);

/**
 * Image upload progress, shown by `FormImageUpload` while a multipart save is in flight.
 */
const { progress: uploadProgress, trackUpload } = useAxiosUploadProgress();

/**
 * Auto-hydrate the form from the fetched admin record once it resolves.
 */
activateAutoHydrate(
    holdWhileSubmitting(isSubmitting, () =>
        // Waits for the default language's tag too: its tab is built from the record's `source`.
        adminProduct.value && fallbackLocale.value
            ? {
                  price: adminProduct.value.price,
                  active: adminProduct.value.active ?? false,
                  purchasable: adminProduct.value.purchasable ?? true,
                  releaseDate: adminProduct.value.releaseDate,
                  allowBackorder: adminProduct.value.allowBackorder ?? false,
                  restockDate: adminProduct.value.restockDate,
                  requiresShipping: adminProduct.value.requiresShipping ?? true,
                  noWithdrawal: adminProduct.value.noWithdrawal ?? false,
                  weight: adminProduct.value.weight,
                  taxClass: adminProduct.value.taxClass ?? null,
                  // Fresh arrays too, same reason as `translations` below: a chip added then
                  // discarded via "Reset changes" must not have mutated the fetched record.
                  categories: [...(adminProduct.value.categories ?? [])],
                  tags: [...(adminProduct.value.tags ?? [])],
                  // A fresh object: the admin record's own `translations` must not be mutated by a
                  // later tab edit — `resetForm()` (the "Reset changes" button) needs it intact to
                  // hydrate from again. The default language's tab is the stored `source`.
                  translations: toFormTranslations(
                      adminProduct.value.source,
                      adminProduct.value.translations,
                      fallbackLocale.value
                  )
              }
            : undefined
    )
);

/**
 * What a 404 or 403 on the admin read does: the Error page, not a form left empty. Any other
 * failure toasts.
 */
const onMissingRecord = useMissingRecord();

/**
 * Loads the admin record whenever the route's product id changes, and resets the open tab: a
 * route change while this view stays mounted (editing product A, then B) must not leave B's form
 * open on whichever tab A happened to be on.
 */
watch(
    () => id,
    (productId) => {
        activeTab.value = undefined;
        if (productId) loadAdminProduct(productId).catch(onMissingRecord);
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
 * Asks, before a later or cleared release date is saved, how many buyers it reaches.
 */
const { confirmReleaseDateMove } = useReleaseDateConfirm(() => adminProduct.value?.releaseDate);

/**
 * The same question for a restock date, which moves the promise of the owed units.
 */
const { confirmReleaseDateMove: confirmRestockDateMove } = useReleaseDateConfirm(
    () => adminProduct.value?.restockDate,
    'restock'
);

/**
 * Sends one product's `PATCH`, with the picked image when there is one, behind the upload bar.
 *
 * @param productId - The routed product.
 * @param body - The `PATCH` body.
 * @param imageUpload - The picked replacement image, when there is one.
 * @returns The store's update promise.
 */
const sendProductUpdate = (
    productId: string,
    body: Omit<Parameters<typeof updateProduct>[1], 'imageUpload'>,
    imageUpload?: File
) =>
    trackUpload(imageUpload, (options) =>
        updateProduct(productId, { ...body, imageUpload }, { requestOptions: options })
    );

/**
 * After a save. The API answered with the product as a GET by this caller reads it: the stored
 * `imageUrl` and, for a holder of `read:Translation`, the merged translations. The admin record is
 * the one place both live, so it is reloaded rather than patched by hand — the store's own
 * optimistic patch skips `translations` for the same reason (see `products/store.ts`).
 *
 * @param productId - The saved product.
 * @returns A promise resolving `void` once the admin record is reloaded (`handleSubmit`'s
 *  callback must resolve `void`; the reload, not its value, is the point).
 */
const onProductSaved = (productId: string): Promise<void> => {
    form.value.imageUpload = undefined;
    markSaved();
    addMessage(t('product-edit-page.success-update'));
    return loadAdminProduct(productId).then(() => undefined);
};

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
            purchasable,
            releaseDate,
            allowBackorder,
            restockDate,
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
        return confirmReleaseDateMove(id, releaseDate)
            .then((confirmed) => confirmed && confirmRestockDateMove(id, restockDate))
            .then((confirmed) => {
                if (!confirmed) return;
                return toRequestBody('UpdateProductByIdBody', {
                    // Sent at the places the product's own price is written with.
                    price: padDecimal(
                        normalizeAmount(price, getCurrentLocale()),
                        decimalScale(adminProduct.value?.price ?? '')
                    ),
                    active,
                    purchasable,
                    releaseDate: dayChange(adminProduct.value?.releaseDate, releaseDate),
                    allowBackorder,
                    restockDate: dayChange(adminProduct.value?.restockDate, restockDate),
                    requiresShipping,
                    noWithdrawal,
                    weight,
                    taxClass,
                    categories,
                    tags,
                    // The default language's tab is the top-level `title`/`description`.
                    ...toPatchFields(translations, fallbackLocale.value ?? '')
                })
                    .then((body) => sendProductUpdate(id, body, imageUpload))
                    .then(() => onProductSaved(id));
            });
    }).catch(handleSubmitFailure);
};

/**
 * The rows of the aside summary card: identity and timestamps, formatted for display.
 */
const asideFields = computed<DetailFieldRow[]>(() => [
    { label: t('product-target-page.label-id'), value: id, icon: Hash },
    {
        label: t('product-target-page.label-created-at'),
        value: formatDateTime(adminProduct.value?.createdAt),
        icon: Calendar
    },
    {
        label: t('product-target-page.label-updated-at'),
        value: formatDateTime(adminProduct.value?.updatedAt),
        icon: Clock
    }
]);
</script>

<template>
    <div id="product-edit-page">
        <component
            :is="watcher"
            v-for="(watcher, index) in availabilityWatchers"
            :key="index"
            :product-ids="watchedIds"
            :stale-time="0"
        />
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

            <CardDetail :title="t('generic.details')" :subtitle="t('product-edit-page.page-title')">
                <template #title-actions>
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
                </template>

                <form
                    ref="formElement"
                    novalidate
                    class="flex flex-col gap-2"
                    @submit.prevent="submitForm"
                >
                    <fieldset
                        :disabled="loadingAdmin"
                        class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0"
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
                        <v-tabs-window v-model="activeTab">
                            <v-tabs-window-item
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
                                    v-bind="
                                        fieldErrorProps(
                                            showFormErrors && !form.translations[tag]?.title
                                                ? [t('products-form.title-required')]
                                                : []
                                        )
                                    "
                                    data-test="translation-title-field"
                                />
                                <v-textarea
                                    v-model="form.translations[tag]!.description"
                                    :label="t('product-edit-page.label-description')"
                                    :rows="5"
                                    data-test="translation-description-field"
                                />
                            </v-tabs-window-item>
                        </v-tabs-window>

                        <v-text-field
                            v-model="form.price"
                            :label="t('product-edit-page.label-price')"
                            inputmode="decimal"
                            v-bind="fieldErrorProps(showFormErrors ? formErrors.price : [])"
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
                        <v-text-field
                            v-model="form.releaseDate"
                            type="date"
                            :label="t('product-edit-page.label-release-date')"
                            :hint="
                                (id ? availabilityOf(id)?.availability === 'preorder' : false)
                                    ? t('product-edit-page.hint-release-date-preorder')
                                    : t('product-edit-page.hint-release-date')
                            "
                            persistent-hint
                            clearable
                            data-test="product-release-date-field"
                        />
                        <v-checkbox
                            v-model="form.allowBackorder"
                            :label="t('product-edit-page.label-allow-backorder')"
                            :hint="
                                t('product-edit-page.hint-allow-backorder', {
                                    days: backorderPromiseDays
                                })
                            "
                            persistent-hint
                            data-test="product-allow-backorder-field"
                        />
                        <v-text-field
                            v-if="form.allowBackorder"
                            v-model="form.restockDate"
                            type="date"
                            :label="t('product-edit-page.label-restock-date')"
                            :hint="
                                t('product-edit-page.hint-restock-date', {
                                    days: backorderPromiseDays
                                })
                            "
                            persistent-hint
                            clearable
                            data-test="product-restock-date-field"
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
                            v-model="form.purchasable"
                            :label="t('product-edit-page.label-purchasable')"
                            :hint="t('product-edit-page.hint-purchasable')"
                            persistent-hint
                            data-test="product-purchasable-field"
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
                            v-bind="fieldErrorProps(showFormErrors ? formErrors.imageUpload : [])"
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
                    </fieldset>
                </form>
            </CardDetail>

            <template #aside>
                <RecordAsideCard
                    :title="heroTitle"
                    :description="heroDescription"
                    accent="primary"
                    :fields="asideFields"
                >
                    <template #icon><Package :size="28" /></template>
                </RecordAsideCard>
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
