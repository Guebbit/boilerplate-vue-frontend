import { config } from '@vue/test-utils';
import { vuetify } from '@/plugins/vuetify';

/*
 * jsdom polyfills required by Vuetify components.
 */
globalThis.ResizeObserver ??= class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

globalThis.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    // eslint-disable-next-line unicorn/no-null
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
})) as typeof globalThis.matchMedia;

/*
 * Register the custom Vuetify plugin on every mounted component.
 */
config.global.plugins.push(vuetify);
