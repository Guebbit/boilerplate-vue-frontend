import { ref, watch, type Ref } from 'vue';

interface IUseItemDetailFormOptions<TItem, TForm> {
    /**
     * Selected store item used to hydrate/reset the form state.
     */
    currentItem: Ref<TItem | undefined | null>;
    /**
     * Reactive form object from the form validation toolkit.
     */
    form: Ref<TForm>;
    /**
     * Mapper that transforms a domain item into form state.
     */
    mapToForm: (item: TItem | undefined | null) => TForm;
}

/**
 * Encapsulates detail/edit form hydration and error-visibility toggling.
 *
 * Watch activation is wrapped in an explicit helper so lifecycle behavior stays
 * obvious and follows the requested pattern.
 */
export const useItemDetailForm = <TItem, TForm>({
    currentItem,
    form,
    mapToForm
}: IUseItemDetailFormOptions<TItem, TForm>) => {
    const showErrors = ref(false);

    /**
     * Rebuilds form state starting from the current store record.
     */
    const resetForm = () => {
        form.value = mapToForm(currentItem.value);
        showErrors.value = false;
    };

    /**
     * Activates the watcher that auto-hydrates the form after record fetch.
     */
    const activateWatcherCurrentItem = () =>
        watch(
            currentItem,
            (item) => {
                if (item) resetForm();
            },
            { immediate: true }
        );

    activateWatcherCurrentItem();

    return {
        showErrors,
        resetForm,
        activateWatcherCurrentItem
    };
};
