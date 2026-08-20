/**
 * The sub-pages a module has earned, and which module each belongs to.
 *
 * Most modules are one page. A sub-page exists when a domain holds a flow that will not fit in the
 * story section without burying everything else. Declaring them here rather than discovering them
 * from the filesystem is what lets `npm run check:module-docs` fail on a declared page that was
 * never written, and on a stray page nothing declares.
 */

/** One sub-page: the module it belongs to, its file stem, and the sidebar label. */
export interface SubPage {
    module: string;
    /** File stem under `docs/modules/`, e.g. `cart-checkout` for `cart-checkout.md`. */
    slug: string;
    title: string;
}

export const SUB_PAGES: readonly SubPage[] = [
    { module: 'cart', slug: 'cart-checkout', title: 'The checkout flow' },
    { module: 'admin', slug: 'admin-dashboard', title: 'The dashboard' },
    { module: 'locales', slug: 'locales-overrides', title: 'Runtime overrides' }
];

/** The sub-pages belonging to one module. */
export const subPagesOf = (moduleName: string): SubPage[] =>
    SUB_PAGES.filter((page) => page.module === moduleName);
