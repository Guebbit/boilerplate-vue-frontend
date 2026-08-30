/**
 * @module
 * Composable binding the toolkit's generic `useStructureFormValidation` to this app's fixed
 * answers for i18n, notifications and the invalid-field selector, so every form wires the same
 * way instead of re-deciding those three things each time.
 */

import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/infrastructure/utils/errors.ts';
import type { MaybeRefOrGetter } from 'vue';
import type { ZodType } from 'zod';

/**
 * This application's three answers to `useStructureFormValidation`'s open questions.
 *
 * The toolkit is deliberately ignorant of vue-i18n, of Vuetify and of where a message goes — its
 * own docblock says so, and that is what makes it reusable. The consequence is that a correct form
 * here has to supply the same three things every time, and thirteen forms proved that does not
 * happen: five of them shipped missing at least one, and two of those had `showFormErrors` in
 * scope and declared a `ref(false)` beside it instead.
 *
 * So the policy is bound once, here, and a form supplies only what is genuinely its own: the
 * shape, the schema, and the element to focus into. Same relationship `formatCurrency` has with
 * the toolkit's `formatCurrencyBase` — the mechanism stays out there, the app's answers live in
 * one place.
 *
 * `tests/cross-cutting/form-idiom.spec.ts` is what keeps the fourteenth form from drifting.
 */
export interface UseAppFormSettings {
    /**
     * The `<form>` element, so a failed submit can focus the first invalid field.
     *
     * Omit it and `revealErrors()` degrades to a pure state change, which is the right shape for
     * a dialog: it already traps focus, so moving focus again inside it is a different question
     * from moving it on a page.
     */
    formElement?: MaybeRefOrGetter<HTMLElement | undefined | null>;
}

/**
 * A form, wired the way every form in this app is wired.
 *
 * @typeParam T - The form's field shape.
 * @param initialData - Starting values; also what `resetForm()` restores.
 * @param schema - Zod schema whose messages are thunks, so they resolve in the active language.
 * @param settings - See {@link UseAppFormSettings}.
 * @returns Everything `useStructureFormValidation` returns. `showFormErrors` is the gate a
 *  template reads — there is never a reason to declare another one beside it.
 */
/*
 * `any` rather than `unknown` because it mirrors the toolkit's own constraint, and because
 * `unknown` is the narrower of the two here: an interface has no index signature, so every form
 * shape in this app fails `Record<string, unknown>` and satisfies `Record<string, any>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export const useAppForm = <T extends Record<string, any>>(
    initialData: T,
    schema?: MaybeRefOrGetter<ZodType<T> | undefined>,
    { formElement }: UseAppFormSettings = {}
) => {
    const { t, locale } = useI18n();
    const { addMessage } = useNotificationsStore();

    return useStructureFormValidation<T>(initialData, schema, {
        // Re-parses the data so errors already on screen change language with the page. Without
        // it `formErrors` holds resolved strings, and a re-render just re-prints the old ones.
        revalidateOn: locale,
        formElement,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    });
};
