import { computed, ref, watch, type Ref, type ComputedRef } from 'vue'
import { z, type ZodSchema } from 'zod'
import { zodErrorInterpreter } from '@/utils/helperErrors.ts'

export const useStructureFormValidation = <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string | number | symbol, any> = Record<string, any>,
>(
    zodSchema: ZodSchema = z.any(),
    constantValidation = true
) => {

    /**
     * Form state
     */
    const form = ref({} as Partial<T>)

    /**
     * Form original state (for reset, no need to be reactive)
     */
    const initial = ref({} as Partial<T>)
    const setInitial = (referredVariable: ComputedRef<T | undefined> | Ref<T | undefined>) => {
        watch(referredVariable, (value) => {
            // If the form was not changed, update the form too
            if(!hasChanged.value)
                form.value = {
                    ...value
                }
            // Update the initial value
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            initial.value = {
                ...initial.value,
                ...value
            }
        }, {
            deep: true
        })
    }

    /**
     * Current form errors
     */
    const errors = ref<Record<string, string[]>>({})

    /**
     * List of all errors
     */
    const errorsList = computed(() => Object.values(errors.value).flat())

    /**
     * Decide when to show errors
     */
    const showErrors = ref(false)

    /**
     * Check if form is valid
     */
    const isValid = computed(() => errorsList.value.length === 0)

    /**
     * Check if form was used
     */
    const hasChanged = computed(() =>
        JSON.stringify(form.value) !== JSON.stringify(initial.value)
    )

    /**
     * Reset form to initial state and remove errors
     * (new errors may arise if the initial state was invalid)
     */
    const reset = () => {
        errors.value = {}
        form.value = { ...initial.value }
    }

    /**
     * Form validation
     */
    const validate = () => {
        const parseResult = zodSchema.safeParse(form.value)
        if (parseResult.success)
            return true
        for (const [field, message] of zodErrorInterpreter(parseResult)) {
            if (!Object.hasOwnProperty.call(errors.value, field))
                errors.value[field] = []
            errors.value[field].push(message)
        }
        return false
    }

    /**
     * Trigger form validation on form change (if required)
     */
    watch(form, () => constantValidation && validate(), {
        deep: true
    })

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
        validate
    }
}
