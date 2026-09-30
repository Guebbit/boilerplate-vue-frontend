/**
 * @module
 * Everything `ProductCreate.vue` and `ProductEdit.vue` share: the toolkit form, one language tab
 * per entry of `form.translations`, per-tab error badges, and what a failed submit does with the
 * error. The views keep what differs — the fields around the tabs, the request itself, and
 * whether a 412 can happen at all.
 *
 * `translations` mirrors the write body's own shape (`ProductTranslationsWrite`): an object
 * upserts a locale, `null` marks it for deletion, an absent key leaves it alone.
 */
import { ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import type { ZodType } from 'zod';
import { useTranslationTabOrder } from '@/ui/composables/use-translation-tab-order.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import {
    translationTabErrorCountsFromZodError,
    translationTabErrorCountsFromServerError,
    type TranslationTabErrorCounts
} from '@/modules/products/composables/translation-tab-errors.ts';
import type { ProductTranslationsWrite } from '@types';

/**
 * The one field of a form this composable reads and writes.
 */
export interface TranslatedForm {
    /**
     * Per-locale content, in the write body's own shape.
     */
    translations: ProductTranslationsWrite;
}

/**
 * What one form hands to {@link useTranslatedEntityForm}.
 */
export interface TranslatedEntityFormOptions<TForm extends TranslatedForm> {
    /**
     * The form's initial values, `translations` included.
     */
    initial: TForm;
    /**
     * The validation schema; its `translations` rule is what feeds the tab badges.
     */
    schema: ZodType<TForm>;
    /**
     * The `<form>` element (a ref, or a getter for a child component's), for scroll-to-invalid.
     */
    formElement: Ref<HTMLFormElement | undefined> | (() => HTMLFormElement | undefined);
    /**
     * The deployment's fallback locale tag once known — its tab is first and never closable.
     */
    fallbackLocale: Ref<string | undefined>;
    /**
     * Opens the fallback tab as soon as its tag is known. A create needs it (a product with no
     * fallback translation cannot exist); an edit gets it from the record instead.
     */
    seedFallback?: boolean;
    /**
     * The translations the server already holds. A tab removed from here is sent as `null`, one
     * opened only this session is simply dropped; re-opening a stored one restores its content.
     */
    stored?: () => Record<string, ProductTranslationsWrite[string]> | undefined;
    /**
     * Tells a failed submit whether it was a 412. Returns `true` when it handled the error, which
     * stops the usual field-error handling.
     */
    onStale?: (error: unknown) => boolean;
    /**
     * Shows a failure no field can take, blocking the form in place.
     */
    reportSubmitError: (error: unknown) => void;
}

/**
 * A blank tab, what a locale opened this session starts as.
 */
const blankTranslation = () => ({ title: '', description: '' });

/**
 * One translated-entity form: toolkit state, language tabs and the shared failure tail.
 *
 * @param options - See {@link TranslatedEntityFormOptions}.
 * @returns The toolkit's form state, plus `openTags`, `activeTab`, `tabErrorCounts`,
 *  `handleAddLocale`, `handleRemoveLocale` and `handleSubmitFailure` for the template and submit.
 */
export const useTranslatedEntityForm = <TForm extends TranslatedForm>(
    options: TranslatedEntityFormOptions<TForm>
) => {
    /**
     * The APP's interface language, unrelated to which language TAB is open — an editor writing
     * Italian copy while using an English admin is the normal case. Changing it revalidates.
     */
    const { t, locale } = useI18n();

    /**
     * Toast helper for "fix the errors" on an invalid submit.
     */
    const { addMessage } = useNotificationsStore();

    /**
     * Toolkit form state and submit handler.
     */
    const validation = useStructureFormValidation<TForm>(options.initial, options.schema, {
        formElement: options.formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    });
    const { form, showFormErrors, applyServerErrors } = validation;

    /**
     * Which language tabs are open, fallback first — derived from `form.translations` itself, so a
     * `resetForm()` cannot leave the tab bar out of sync with the data it reflects. The fallback
     * is put first only once it has an entry: a tab is never manufactured from a tag alone.
     */
    const openTags = useTranslationTabOrder(() => form.value.translations, options.fallbackLocale);

    /**
     * The tab currently shown.
     */
    const activeTab = ref<string>();

    // The first tab to appear becomes the shown one; a later change never moves the visitor.
    watch(
        openTags,
        (tags) => {
            activeTab.value ??= tags[0];
        },
        { immediate: true }
    );

    // A create's fallback slot is only ever ADDED, never re-checked: it cannot be removed.
    if (options.seedFallback)
        watch(
            options.fallbackLocale,
            (fallback) => {
                if (!fallback || fallback in form.value.translations) return;
                form.value.translations = {
                    ...form.value.translations,
                    [fallback]: blankTranslation()
                };
            },
            { immediate: true }
        );

    /**
     * Opens a language tab: blank, or with the stored content when it was removed earlier this
     * session, so undoing a removal costs nothing.
     *
     * @param tag - The locale to open.
     */
    const handleAddLocale = (tag: string) => {
        form.value.translations = {
            ...form.value.translations,
            [tag]: options.stored?.()?.[tag] ?? blankTranslation()
        };
        activeTab.value = tag;
    };

    /**
     * Closes a language tab. A locale the server holds is marked `null` (the PATCH's delete
     * signal, sent with this submit); one never saved is dropped, with nothing to delete.
     *
     * @param tag - The locale to close. The fallback tab is never offered this (see
     *  `TranslationTabs`), so it never reaches here.
     */
    const handleRemoveLocale = (tag: string) => {
        const stored = options.stored?.();
        if (stored && tag in stored) {
            form.value.translations = { ...form.value.translations, [tag]: null };
        } else {
            const { [tag]: _removed, ...rest } = form.value.translations;
            form.value.translations = rest;
        }
        // `openTags` derives from the form, already changed, so it no longer lists `tag`.
        if (activeTab.value === tag) activeTab.value = openTags.value[0];
    };

    /**
     * Per-locale error counts for the tab badges. `useStructureFormValidation`'s own `formErrors`
     * cannot give them: it collapses every `translations.*` issue into one bucket (see
     * `translation-tab-errors.ts`). Empty until a submit reveals errors.
     */
    const tabErrorCounts = ref<TranslationTabErrorCounts>({});

    watch(
        [showFormErrors, () => form.value],
        ([showing]) => {
            if (!showing) {
                tabErrorCounts.value = {};
                return;
            }
            const result = options.schema.safeParse(form.value);
            tabErrorCounts.value = result.success
                ? {}
                : translationTabErrorCountsFromZodError(result.error);
        },
        { deep: true }
    );

    /**
     * What a rejected submit does, in order: a 412 is the caller's; a per-language 422 also badges
     * the tab it names; whatever no field can take blocks the form in place.
     *
     * @param error - The rejected value from the submit chain.
     */
    const handleSubmitFailure = (error: unknown) => {
        if (options.onStale?.(error)) return;
        const serverTabErrors = translationTabErrorCountsFromServerError(error);
        if (Object.keys(serverTabErrors).length > 0)
            tabErrorCounts.value = { ...tabErrorCounts.value, ...serverTabErrors };
        applyServerErrors(error, { onUnmapped: () => options.reportSubmitError(error) });
    };

    return {
        ...validation,
        openTags,
        activeTab,
        tabErrorCounts,
        handleAddLocale,
        handleRemoveLocale,
        handleSubmitFailure
    };
};
