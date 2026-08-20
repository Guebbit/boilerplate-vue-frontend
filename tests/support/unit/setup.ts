/**
 * Vitest setup: polyfills jsdom for Vuetify components.
 *
 * Deliberately imports NOTHING from `@/modules` or `@/kernel`. A setup file is evaluated before
 * the spec module, so anything it imports is resolved and bound before a spec's hoisted
 * `vi.mock(...)` can register: pull the app's module graph in here and
 * `vi.mock('@/infrastructure/http')` silently becomes a no-op for the generated API client.
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
