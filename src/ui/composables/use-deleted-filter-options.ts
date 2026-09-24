/**
 * @module
 * The three choices of an admin list's "Deleted" filter, shared by every list whose records can be
 * soft-deleted (products, users, orders). The value is the API's own `deleted` search filter:
 * absent lists both, `false` only live records, `true` only soft-deleted ones.
 */
import { computed, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';

/** One option of the filter's select. */
export interface DeletedFilterOption {
    /** The `deleted` filter value this option sends; `undefined` sends none. */
    value: boolean | undefined;
    /** The option's localized label. */
    label: string;
}

/**
 * The filter's options, re-translated on locale change.
 *
 * @returns A computed list to bind to a `v-select`'s `:items`.
 */
export const useDeletedFilterOptions = (): ComputedRef<DeletedFilterOption[]> => {
    const { t } = useI18n();
    return computed(() => [
        { value: undefined, label: t('generic.filter-deleted-any') },
        { value: false, label: t('generic.filter-deleted-live') },
        { value: true, label: t('generic.filter-deleted-only') }
    ]);
};
