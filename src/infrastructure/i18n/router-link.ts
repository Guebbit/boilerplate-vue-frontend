import { getCurrentLocale, supportedLanguages } from './index.ts';
import type { RouteLocationRaw } from 'vue-router';

/*
 * Imported from its own path rather than re-exported by `index.ts`: a barrel re-export would make
 * the two files depend on each other, and Rollup then cannot put them in one chunk — it warns
 * about exactly that and the execution order it cannot guarantee.
 */

/**
 * Prefixes a path with a locale segment, unless it already starts with a supported one.
 *
 * @param path - Absolute or relative path, e.g. `/products` or `products`.
 * @param locale - Locale code to prepend, e.g. `en`.
 * @returns The normalized, locale-prefixed path, e.g. `/en/products`.
 */
function prefixLocalePath(path: string, locale: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const firstSegment = normalized.split('/')[1];
    return supportedLanguages.includes(firstSegment) ? normalized : `/${locale}${normalized}`;
}

/**
 * Rewrites a router location so it carries the current locale.
 *
 * vue-router ignores `params` whenever `path` is present, so path-based locations must have the
 * locale prefixed onto the path itself — a bare `/products` would otherwise match `/:locale` with
 * locale="products".
 *
 * @param to - Any router location: a path string, a `path`-based object, or a named location.
 * @returns The same location with the locale injected — into the path for string/`path` forms,
 *  into `params.locale` for named ones. An explicit `params.locale` on the input wins.
 */
export function routerLinkI18n(to: RouteLocationRaw): RouteLocationRaw {
    const locale = getCurrentLocale();
    if (typeof to === 'string') return prefixLocalePath(to, locale);
    if ('path' in to && typeof to.path === 'string')
        return {
            ...to,
            path: prefixLocalePath(to.path, locale)
        };
    // Named form: spread the caller's params last so an explicit `locale` wins over the current one.
    return {
        ...to,
        params: {
            locale,
            ...to.params
        }
    };
}
