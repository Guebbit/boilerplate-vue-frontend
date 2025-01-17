export const useStructureFormValidation = <
    // type of form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string | number | symbol, ITestMe> = Record<string, ITestMe>
>() => {
    /**
     * Form and it's Factory (starting values)
     */
    let original = {} as T;
    const form = ref({} as T);

    /**
     *
     */
    const formHasChanged = computed(
        () => JSON.stringify(form.value) !== JSON.stringify(original)
    );

    const formReset = () =>
        form.value = { ...original }


    // TODO prendere isValid, zod, etc... da boilerplate-node


}