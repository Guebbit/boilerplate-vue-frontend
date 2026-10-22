/**
 * @module
 * A table row that opens something instead of staying selected. The table's selection model is
 * read once, handed on as the matching row, and cleared, so the same row can be opened again.
 */
import { ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * Builds the one-shot selection model.
 *
 * @param rows - The rows the table shows.
 * @param onPick - Called with the row whose id was selected.
 * @returns The id ref to bind as the table's selection `v-model`.
 */
export const useRowSelect = <TRow extends { id: string }>(
    rows: Ref<TRow[]>,
    onPick: (row: TRow) => void
): Ref<string | undefined> => {
    /**
     * The id the table just selected; cleared straight away.
     */
    const selectedId = ref<string>();

    watch(selectedId, (id) => {
        if (id === undefined) return;
        const picked = rows.value.find((row) => row.id === id);
        selectedId.value = undefined;
        if (picked) onPick(picked);
    });

    return selectedId;
};
