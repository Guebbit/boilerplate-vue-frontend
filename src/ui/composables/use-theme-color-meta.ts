/**
 * @module
 * The browser's address bar follows the app's theme, not only the OS's.
 *
 * `index.html` ships a `theme-color` pair keyed to `prefers-color-scheme`, which is right before
 * the app boots and for the `system` theme. A visitor who forces dark on a light OS (or the other
 * way round) would keep the OS colour in the browser chrome; this composable closes that gap.
 */
import { watch } from 'vue';
import { useTheme } from 'vuetify';

/**
 * Writes the active theme's `surface` colour (the app bar's colour) into every
 * `<meta name="theme-color">` tag, and keeps doing so when the theme changes.
 *
 * Call once, where the app shell mounts.
 */
export const useThemeColorMeta = (): void => {
    /**
     * Vuetify: `useTheme()` returns the theme controller. `global.current` is a ref to the active
     * theme definition, with `system` already resolved to light or dark.
     * https://vuetifyjs.com/en/features/theme/
     */
    const theme = useTheme();
    watch(
        () => theme.global.current.value.colors.surface,
        (surface) => {
            // Vuetify types a colour as string | number | RGB | HSV; the theme file declares hex.
            if (typeof surface !== 'string') return;
            // eslint-disable-next-line unicorn/prefer-spread -- a NodeList is not iterable under this project's lib ("DOM" without "DOM.Iterable"), so Array.from is the typed way
            for (const meta of Array.from(document.querySelectorAll('meta[name="theme-color"]')))
                meta.setAttribute('content', surface);
        },
        { immediate: true }
    );
};
