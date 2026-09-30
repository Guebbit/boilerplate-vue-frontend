/**
 * @module
 * What a derived project changes to look like its own: the product name and the logo. Both are
 * deployment values (`VITE_APP_NAME`, `VITE_APP_LOGO`), overridable in a running container, so
 * renaming the app touches no source file.
 */
import { runtimeValue } from '@/infrastructure/runtime-config';

/**
 * The name that follows every page title in the browser tab, and stands alone on a route that
 * declares none.
 *
 * @returns The configured name, or `Guebbit` when none is set.
 */
export const brandName = (): string =>
    runtimeValue('APP_NAME') || import.meta.env.VITE_APP_NAME || 'Guebbit';

/**
 * The logo the app bar shows: an absolute URL as configured, or a path under the app's base
 * (`public/images/…`), so a sub-path deployment still finds it.
 *
 * @param baseUrl - Vite's `BASE_URL`, ending in a slash.
 * @returns The `src` for the logo image.
 */
export const brandLogoSource = (baseUrl: string): string => {
    const configured = runtimeValue('APP_LOGO') || import.meta.env.VITE_APP_LOGO;
    if (!configured) return `${baseUrl}images/guebbit-logo-colored.png`;
    // A URL with a scheme, or a protocol-relative one, is already complete.
    return /^([a-z][\d+.a-z-]*:|\/\/)/i.test(configured)
        ? configured
        : `${baseUrl}${configured.replace(/^\/+/, '')}`;
};
