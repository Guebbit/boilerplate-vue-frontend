/**
 * Vitest setup: polyfills jsdom for Vuetify components, and clears the app's shared TanStack
 * query cache before every test.
 *
 * Deliberately imports NOTHING from `@/modules` or `@/kernel`. A setup file is evaluated before
 * the spec module, so anything it imports is resolved and bound before a spec's hoisted
 * `vi.mock(...)` can register: pull the app's module graph in here and
 * `vi.mock('@/infrastructure/http')` silently becomes a no-op for the generated API client.
 * `@/infrastructure/query-client.ts` is safe to import here regardless — it pulls in only
 * `@tanstack/vue-query`, never the API client or a module.
 */
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from './msw-server.ts';
import { queryClient } from '@/infrastructure/query-client.ts';

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

/**
 * Every store shares ONE `QueryClient` (vue-toolkit 5 has no private, per-resource client any
 * more), and that client is a module-level singleton — without this, a query cached by one test
 * would still answer a later test's mocked call from cache, unrelated to the two tests' own
 * `beforeEach`/`vi.clearAllMocks`. `clear()` drops every cached query and mutation, so every test
 * starts as cold as a fresh `useStructureRestApi` instance did in vue-toolkit 4.
 */
beforeEach(() => {
    queryClient.clear();
});

/**
 * Starts the shared MSW server. `onUnhandledRequest: 'error'` prints the method and URL of any
 * call no handler answers and refuses it, so no unit spec ever opens a real socket. Whatever
 * happens to listen on localhost:3000 (often the paired backend) can no longer change a result.
 * https://mswjs.io/docs/api/setup-server/listen
 */
beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
});

/**
 * Drops the handlers a spec added with `server.use(...)`, so one test's mocks never answer the next.
 * https://mswjs.io/docs/api/setup-server/reset-handlers
 */
afterEach(() => {
    server.resetHandlers();
});

/**
 * Stops intercepting and restores the patched Node request modules.
 * https://mswjs.io/docs/api/setup-server/close
 */
afterAll(() => {
    server.close();
});
