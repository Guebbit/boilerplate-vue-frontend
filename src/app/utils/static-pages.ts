/**
 * @module
 * Shared list of the shop's prose pages (about/FAQ/terms/privacy) and the one formula that
 * turns a page name into its route name. The router, the footer and every page that cross-links
 * its siblings all read from here, so the mapping lives in exactly one place.
 */

/**
 * The shop's prose pages, in the order they are linked everywhere (footer, cross-links).
 */
export const STATIC_PAGES = ['about', 'faq', 'terms', 'privacy'] as const;

/**
 * One of the shop's prose pages.
 */
export type StaticPageName = (typeof STATIC_PAGES)[number];

/**
 * The router name for a static page — `about` becomes `StaticAbout`, etc.
 *
 * @param page - Which static page.
 * @returns The route name declared in the router.
 */
export const staticPageRouteName = (page: StaticPageName): string =>
    'Static' + page[0].toUpperCase() + page.slice(1);

/**
 * Resolves a `tm()` lookup into rendered paragraph strings, `rt()`-processed for any rich-text
 * formatting. `tm` answers `{}` for a path the dictionary does not carry, and an empty object
 * taken for an array would render nothing — so a non-array result becomes an empty list.
 *
 * @param tm - The active `useI18n().tm` function.
 * @param rt - The active `useI18n().rt` function.
 * @param path - Dictionary path holding the paragraph array.
 * @returns The paragraphs, rendered.
 */
export const staticPageParagraphs = (
    tm: (path: string) => unknown,
    rt: (message: string) => string,
    path: string
): string[] => {
    const messages = tm(path);
    return Array.isArray(messages) ? messages.map((message) => rt(message as string)) : [];
};
