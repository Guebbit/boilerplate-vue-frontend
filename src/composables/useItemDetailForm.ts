import { ref, watch, type Ref } from 'vue';

interface IUseItemDetailFormOptions<TItem, TForm> {
    currentItem: Ref<TItem | undefined | null>;
    form: Ref<TForm>;
    mapToForm: (item: TItem | undefined | null) => TForm;
}

export const useItemDetailForm = <TItem, TForm>({
    currentItem,
    form,
    mapToForm
}: IUseItemDetailFormOptions<TItem, TForm>) => {
    const showErrors = ref(false);

    const resetForm = () => {
        form.value = mapToForm(currentItem.value);
        showErrors.value = false;
    };

    watch(
        currentItem,
        (item) => {
            if (item) resetForm();
        },
        { immediate: true }
    );

    return {
        showErrors,
        resetForm
    };
};
