<script lang="ts">
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
import { useSessionStore } from '@/infrastructure/session.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Languages, Package, Pencil } from 'lucide-vue-next';
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
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import type { ProductTranslationsWrite } from '@types';

/**
 * Localized dictionary helper, with the active locale reference used to revalidate the form.
 */
const { t, locale } = useI18n();

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
 * Whether the visitor may reach the generic translations screen — the same `translations.read`
 * the screen itself is gated on, asked of the server's own rules. A `translator` holds it without
 * ever being handed `products.manage`, and an unrestricted role holds it like everything else.
 */
const session = useSessionStore();
const mayViewTranslations = computed(() => session.can('read', 'Translation'));

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
 * Form definition. `translations` mirrors the write body's own shape
 * (`ProductTranslationsWrite`): an object upserts a locale, `null` deletes it, an absent key
 * leaves it untouched.
 */
interface ProductEditForm {
    price?: number;
    active?: boolean;
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
} = useStructureFormValidation<ProductEditForm>({ translations: {} }, editSchema, {
    formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Image upload progress, shown by `FormImageUpload` while a multipart save is in flight.
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
 * Auto-hydrate the form from the fetched admin record once it resolves.
 */
activateAutoHydrate(
    computed(() =>
        adminProduct.value
            ? {
                  price: adminProduct.value.price,
                  active: adminProduct.value.active ?? false,
                  // Spread into a fresh object: the admin record's own `translations` must not be
                  // mutated by a later tab edit — `resetForm()` (the "Reset changes" button) needs
                  // it intact to hydrate from again.
                  translations: { ...adminProduct.value.translations }
              }
            : undefined
    )
);

/**
 * Which language tabs were present on the LAST loaded admin record — the ones whose removal must
 * send `null` rather than simply dropping the key (see `handleRemoveLocale`). A plain snapshot
 * rather than something derived from `form`: it has to stay fixed against the CURRENT form state
 * changing underneath it, or a removed-then-readded tab could no longer tell "existed on the
 * server" from "opened this session".
 */
const originalTags = ref<string[]>([]);

watch(adminProduct, (product) => {
    if (product) originalTags.value = Object.keys(product.translations);
});

/**
 * Which language tabs are open, fallback locale first — derived from `form.translations` itself
 * (every present, non-`null` key) rather than tracked separately, so a `resetForm()` cannot leave
 * the tab bar out of sync with the data it is supposed to reflect.
 *
 * The fallback tag is prepended only once `form.translations` actually has an entry for it —
 * never manufactured here — which is what keeps this safe against `fetchActiveLocales()` (an
 * independent fetch) resolving before `loadAdminProduct()` does: a fallback with no entry yet
 * simply has no tab, rather than an active one whose `form.translations[tag]` is `undefined`.
 */
const openTags = useTranslationTabOrder(() => form.value.translations, fallbackLocale);

/**
 * The tab currently shown, defaulted to the first one open once the admin record has loaded.
 */
const activeTab = ref<string>();

watch(openTags, (tags) => {
    activeTab.value ??= tags[0];
});

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
 * Opens a language tab — a genuinely new one starts blank, one removed earlier this session
 * (still carrying its original content in the admin record) comes back with that content rather
 * than blank, so undoing a removal costs nothing.
 *
 * @param tag - The locale to open.
 */
const handleAddLocale = (tag: string) => {
    const restored = adminProduct.value?.translations[tag];
    form.value.translations = {
        ...form.value.translations,
        [tag]: restored ?? { title: '', description: '' }
    };
    activeTab.value = tag;
};

/**
 * Closes a language tab. One the admin record already had a row for is marked `null` — the
 * PATCH's delete signal, still riding in this same submit — rather than simply forgotten; one
 * opened only this session, never saved, is dropped outright, since there is nothing server-side
 * for a `null` to delete.
 *
 * @param tag - The locale to close. The fallback tag is never offered this action (see
 *  `TranslationTabs`), so it is never reached here either.
 */
const handleRemoveLocale = (tag: string) => {
    if (originalTags.value.includes(tag)) {
        form.value.translations = { ...form.value.translations, [tag]: null };
    } else {
        const { [tag]: _removed, ...rest } = form.value.translations;
        form.value.translations = rest;
    }
    // `openTags` is derived from `form.translations`, already mutated above, so it no longer
    // lists `tag` by the time this reads it.
    if (activeTab.value === tag) activeTab.value = openTags.value[0];
};

/**
 * Per-locale error counts for the tab badges — computed independently of
 * `useStructureFormValidation`'s own `formErrors`, which collapses every `translations.*` issue
 * into one flat bucket (see `translation-tab-errors.ts`). Only populated once a submit has
 * revealed errors.
 */
const tabErrorCounts = ref<Record<string, number>>({});

watch(
    [showFormErrors, () => form.value],
    ([showing]) => {
        if (!showing) {
            tabErrorCounts.value = {};
            return;
        }
        const result = editSchema.safeParse(form.value);
        tabErrorCounts.value = result.success
            ? {}
            : translationTabErrorCountsFromZodError(result.error);
    },
    { deep: true }
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
 *  revealed validation errors when the input is invalid. API failures surface as a toast, with a
 *  per-language 422 also landing on the tab it names. A missing route id or price is a no-op.
 */
const submitForm = () =>
    handleSubmit(() => {
        const { price, active, translations, imageUpload } = form.value;
        if (!id || price === undefined) return;
        return trackUpload(imageUpload, (options) =>
            updateProduct(id, { price, active, translations, imageUpload }, options)
        ).then(() => {
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
    }).catch((error) => {
        const serverTabErrors = translationTabErrorCountsFromServerError(error);
        if (Object.keys(serverTabErrors).length > 0)
            tabErrorCounts.value = { ...tabErrorCounts.value, ...serverTabErrors };
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
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
                    :value="formatCurrency(adminProduct?.price)"
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
                        <v-window-item v-for="tag in openTags" :key="tag" :value="tag">
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
                        :step="0.01"
                        :precision="2"
                        control-variant="stacked"
                        :error-messages="showFormErrors ? formErrors.price : []"
                        data-test="product-price-field"
                    />
                    <v-switch v-model="form.active" :label="t('product-edit-page.label-active')" />
                    <FormImageUpload
                        v-model="form.imageUpload"
                        :current-image-url="adminProduct?.imageUrl"
                        :error-messages="showFormErrors ? formErrors.imageUpload : []"
                        :progress="uploadProgress"
                        :disabled="isSubmitting"
                    />

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
                        :value="formatDateTime(adminProduct?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-updated-at')"
                        :value="formatDateTime(adminProduct?.updatedAt)"
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
