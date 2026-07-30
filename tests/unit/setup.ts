/**
 * Vitest setup: polyfills jsdom for Vuetify components.
 */

// ResizeObserver — used by v-app-bar, v-number-input & friends
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;

// matchMedia — used by the "system" default theme
globalThis.matchMedia =
    globalThis.matchMedia ??
    ((query: string) =>
        ({
            matches: false,
            media: query,
            // eslint-disable-next-line unicorn/no-null -- DOM typing requires null
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false
        }) as MediaQueryList);

// Pointer capture — used by v-number-input hold-to-repeat buttons
HTMLElement.prototype.setPointerCapture = HTMLElement.prototype.setPointerCapture ?? (() => {});
HTMLElement.prototype.releasePointerCapture =
    HTMLElement.prototype.releasePointerCapture ?? (() => {});

// visualViewport — used by v-overlay positioning
Object.defineProperty(globalThis, 'visualViewport', {
    value: globalThis.visualViewport ?? new EventTarget(),
    writable: true
});
