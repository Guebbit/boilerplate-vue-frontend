import { computed, ref, watch, type Ref, type ComputedRef } from 'vue';
import { type ZodType, z } from 'zod';
import { useStructureFormManagement } from '@guebbit/vue-toolkit';

export const useStructureFormValidation = <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string | number | symbol, any> = Record<string, any>
>(
    zodSchema: ZodType<T> = z.any(),
    _constantValidation = true
) => {
    const {
        form,
        formErrors: errors,
        isValid,
        validate,
        setForm,
        clearErrors,
    } = useStructureFormManagement<T>(undefined, zodSchema);

    /**
     * Whether to display validation errors in the UI
     */
    const showErrors = ref(false);

    /**
     * The "clean" state of the form (used for hasChanged and reset)
     */
    const initial = ref({} as Partial<T>);

    /**
     * Flat list of all error messages
     */
    const errorsList = computed(() =>
        (Object.values(errors.value) as string[][]).flat()
    );

    /**
     * Treat empty and null strings as undefined for comparison purposes
     */
    const sanitizeForm = <F extends Record<string, unknown>>(formData: F): F =>
        Object.fromEntries(
            Object.entries(formData).map(([key, value]) => [
                key,
                value === '' || value === null ? undefined : value
            ])
        ) as F;

    /**
     * True when the current form data differs from the initial state
     */
    const hasChanged = computed(
        () =>
            JSON.stringify(sanitizeForm(form.value as Record<string, unknown>)) !==
            JSON.stringify(sanitizeForm(initial.value as Record<string, unknown>))
    );

    /**
     * Reset form to initial state and clear errors
     */
    const reset = () => {
        clearErrors();
        form.value = { ...initial.value } as T;
    };

    /**
     * Sync the form with an external reactive source (e.g. a store record).
     * The form is updated whenever the source changes, unless the user has
     * already made edits (hasChanged).
     *
     * @param referredVariable
     */
    const setInitial = (referredVariable: ComputedRef<T | undefined> | Ref<T | undefined>) => {
        if (referredVariable.value) {
            initial.value = { ...referredVariable.value };
            setForm(referredVariable.value as T);
        }

        watch(
            referredVariable,
            (value) => {
                if (!hasChanged.value) {
                    form.value = { ...value } as T;
                }
                initial.value = { ...initial.value, ...value } as Partial<T>;
            },
            { deep: true }
        );
    };

    return {
        form,
        initial,
        setInitial,
        errors,
        errorsList,
        showErrors,
        isValid,
        hasChanged,
        reset,
        validate,
    };
};

