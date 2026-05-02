import { onMounted, watch, type Ref } from 'vue';

interface IUseListPageOptions<TFilters extends Record<string, unknown>> {
    filters: TFilters;
    pageCurrent: Ref<number>;
    pageSize: Ref<number>;
    initialPageSize?: number;
    fetchSearch: (filters: TFilters, page: number, pageSize: number, forced?: boolean) => Promise<unknown>;
    onError: (error: unknown) => void;
}

export const useListPage = <TFilters extends Record<string, unknown>>({
    filters,
    pageCurrent,
    pageSize,
    initialPageSize = 10,
    fetchSearch,
    onError
}: IUseListPageOptions<TFilters>) => {
    pageSize.value = initialPageSize;

    const fetchCurrentPage = () =>
        fetchSearch(filters, Math.max(1, pageCurrent.value), pageSize.value).catch((error) => onError(error));

    const handleSearch = () => {
        pageCurrent.value = 1;
        return fetchSearch(filters, 1, pageSize.value).catch((error) => onError(error));
    };

    const handleReset = () => {
        for (const key of Object.keys(filters)) delete filters[key as keyof TFilters];
        pageCurrent.value = 1;
        return fetchSearch({} as TFilters, 1, pageSize.value, true).catch((error) => onError(error));
    };

    onMounted(fetchCurrentPage);

    watch([pageCurrent, pageSize], ([currentPage, currentPageSize]) => {
        fetchSearch(filters, Math.max(1, currentPage), currentPageSize).catch((error) => onError(error));
    });

    return {
        handleSearch,
        handleReset
    };
};
