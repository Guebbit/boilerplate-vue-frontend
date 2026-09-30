/**
 * @module
 * A list page's filters and page kept in the URL query string, so a filtered view can be
 * bookmarked, reloaded or handed to support instead of described over chat.
 *
 * The store still owns the state (the toolkit's search reads it live); this only copies it in
 * once on load and writes it back after each search or page change. Replacing history rather than
 * pushing keeps a page change from becoming a back-button stop of its own.
 */
import { watch } from 'vue';
import type { Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { LocationQuery, LocationQueryValue } from 'vue-router';

/**
 * How one filter travels in the query string: a plain string, a number, a `true`/`false`, or one
 * of a closed set of strings (an enum) — a value outside the set is ignored rather than sent to
 * the API to be refused.
 */
export type UrlParameterKind = 'string' | 'number' | 'boolean' | readonly string[];

/**
 * What a list page declares: its refs, and which of its filters live in the URL.
 */
export interface ListUrlStateOptions<TFilters extends object> {
    /** The store's live filters. */
    filters: Ref<TFilters>;
    /** The store's current page, 1-based. */
    page: Ref<number>;
    /** The store's page size, when the page lets the visitor change it. */
    pageSize?: Ref<number>;
    /** The filters that travel in the URL, by name. A filter not listed here never does. */
    params: Partial<Record<keyof TFilters & string, UrlParameterKind>>;
}

/**
 * What a caller gets back.
 */
export interface ListUrlState {
    /**
     * Writes the current filters, page and page size into the URL query. Called by the page after
     * a search it ran itself; a page or page-size change is written without a call.
     */
    sync: () => void;
}

/**
 * The first string of a query value, or `undefined` for an absent or valueless one.
 *
 * @param value - One entry of `route.query`.
 */
const firstOf = (
    value: LocationQueryValue | LocationQueryValue[] | undefined
): string | undefined => (Array.isArray(value) ? value[0] : value) ?? undefined;

/**
 * Reads one raw query string as its declared kind.
 *
 * @param raw - The string from the URL.
 * @param kind - How the filter is declared.
 * @returns The typed value, or `undefined` when the string is not a valid one of that kind.
 */
export const parseUrlParameter = (
    raw: string,
    kind: UrlParameterKind
): string | number | boolean | undefined => {
    if (kind === 'string') return raw === '' ? undefined : raw;
    if (kind === 'number') {
        const parsed = Number(raw);
        return raw.trim() !== '' && Number.isFinite(parsed) ? parsed : undefined;
    }
    if (kind === 'boolean') {
        if (raw === 'true') return true;
        return raw === 'false' ? false : undefined;
    }
    return kind.includes(raw) ? raw : undefined;
};

/**
 * A positive whole number from the URL, or `undefined`.
 *
 * @param raw - The string from the URL.
 */
const positiveInteger = (raw: string | undefined): number | undefined => {
    const parsed = Number(raw);
    return raw !== undefined && Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
};

/**
 * Wires a list page's filters, page and page size to its own URL query string.
 *
 * On load, when the URL names at least one of the page's own parameters, the store's filters are
 * REPLACED by what the URL holds — the URL is the more specific statement. A bare URL leaves the
 * store's state (a previous visit's filters) alone. The URL is not watched afterwards: a link to
 * the same page with another query does not re-apply, which the pages have never done either.
 *
 * @param options - The page's refs and its URL parameters.
 * @returns The call that writes the state back.
 */
export const useListUrlState = <TFilters extends object>(
    options: ListUrlStateOptions<TFilters>
): ListUrlState => {
    const route = useRoute();
    const router = useRouter();
    const names = Object.keys(options.params);
    const defaultPageSize = options.pageSize?.value;

    /**
     * Copies the URL into the refs, when it names any of this page's parameters.
     */
    const hydrate = (query: LocationQuery) => {
        const present = [...names, 'page', 'pageSize'].some(
            (name) => firstOf(query[name]) !== undefined
        );
        if (!present) return;

        const next: Record<string, unknown> = {};
        for (const [name, kind] of Object.entries<UrlParameterKind | undefined>(options.params)) {
            const raw = firstOf(query[name]);
            const value =
                raw === undefined || kind === undefined ? undefined : parseUrlParameter(raw, kind);
            if (value !== undefined) next[name] = value;
        }
        // `TFilters` is a search-filter shape: every field optional, so a subset of its keys is a `TFilters`.
        options.filters.value = next as TFilters;
        options.page.value = positiveInteger(firstOf(query.page)) ?? 1;
        const size = positiveInteger(firstOf(query.pageSize));
        if (options.pageSize && size !== undefined) options.pageSize.value = size;
    };

    hydrate(route.query);

    const sync = () => {
        const query: Record<string, string> = {};
        const current = options.filters.value as Record<string, unknown>;
        for (const name of names) {
            const value = current[name];
            // Only the three kinds a filter can be; anything else has no honest string form.
            if (typeof value === 'number' || typeof value === 'boolean')
                query[name] = String(value);
            else if (typeof value === 'string' && value !== '') query[name] = value;
        }
        if (options.page.value > 1) query.page = String(options.page.value);
        if (options.pageSize && options.pageSize.value !== defaultPageSize)
            query.pageSize = String(options.pageSize.value);
        // Keep a query key this page does not own (a tracking tag, say).
        const foreign = Object.fromEntries(
            Object.entries(route.query).filter(
                ([name]) => !names.includes(name) && name !== 'page' && name !== 'pageSize'
            )
        );
        void router.replace({ query: { ...foreign, ...query } });
    };

    watch([options.page, ...(options.pageSize ? [options.pageSize] : [])], sync);

    return { sync };
};
