/// <reference types="cypress" />

/**
 * The two assertions that hold whatever a page happens to render: it logs nothing unexpected, and
 * it fits its screen (nothing escapes it or is cut off: the layout checks, by element). Shared by the central resilience spec and by each shop module's own,
 * so every route is held to the same pair without any of them naming a value.
 *
 * Why no random data: a console spy and a geometry check answer the question against ANY
 * dataset, and a generated one would only make a failure unreproducible.
 */

/**
 * Console output that is known noise rather than a regression, filtered so it cannot mask a real
 * one — and, just as importantly, so a real one is not dismissed as "probably the usual".
 *
 * Keep this list SHORT and keep it justified. Every entry is a thing this spec has stopped
 * watching, so an unexplained addition is how the whole file quietly stops working.
 *
 * - Grafana Faro (`stores/observability.ts`) logs its own `console.error` whenever it cannot reach
 *   its collector. Its logger appends a newline, so `args[0]` is `'Faro\n'`. Fires on every page
 *   load here, because a plain `vite dev` has no Alloy collector beside it.
 * - `[intlify] Not found '<key>' key in '<locale>' locale messages.` — vue-i18n's lazy-loading
 *   order warning, a known rough edge rather than a broken page.
 *
 * @param call - the arguments one `console.error` / `console.warn` call carried
 */
const isKnownConsoleNoise = (call: unknown[]): boolean => {
    const [first] = call;
    if (typeof first !== 'string') return false;
    return first.trim() === 'Faro' || first.startsWith('[intlify] Not found');
};

/*
 * A plain property on `win`, not a `cy.spy(...).as(...)` alias.
 *
 * A spy has to be registered against a window object, and the very first navigation against a cold
 * `vite dev` server can trigger a dependency-discovery reload mid-visit — which discards the window
 * the spy was attached to and silently takes the spy with it. An array reattached synchronously in
 * `onBeforeLoad` has no registration step to lose: worst case on that one cold path it is reset to
 * empty, which cannot produce a false failure.
 */
const CONSOLE_CAPTURE_KEY = '__resilienceConsoleCalls';

/** One captured `console.error` or `console.warn` call. */
interface ConsoleCall {
    type: 'error' | 'warn';
    args: unknown[];
}

/** The app window, carrying the capture array {@link visitCapturingConsole} hung on it. */
type WindowWithConsoleCapture = Cypress.AUTWindow & {
    [CONSOLE_CAPTURE_KEY]?: ConsoleCall[];
};

/**
 * Visits a path with `console.error` and `console.warn` captured for {@link assertNoConsoleNoise}.
 *
 * @param path - the route to open, locale prefix included
 */
export const visitCapturingConsole = (path: string): void => {
    cy.visit(path, {
        onBeforeLoad(win) {
            const capturedCalls: ConsoleCall[] = [];
            (win as WindowWithConsoleCapture)[CONSOLE_CAPTURE_KEY] = capturedCalls;

            const originalError = win.console.error.bind(win.console);
            win.console.error = (...parameters: unknown[]) => {
                capturedCalls.push({ type: 'error', args: parameters });
                originalError(...parameters);
            };

            const originalWarn = win.console.warn.bind(win.console);
            win.console.warn = (...parameters: unknown[]) => {
                capturedCalls.push({ type: 'warn', args: parameters });
                originalWarn(...parameters);
            };
        }
    });
};

/**
 * Fails when the page logged anything outside the known noise since {@link visitCapturingConsole}.
 */
export const assertNoConsoleNoise = (): void => {
    cy.window().should((win) => {
        const calls = (win as WindowWithConsoleCapture)[CONSOLE_CAPTURE_KEY] ?? [];
        const unexpected = calls.filter((call) => !isKnownConsoleNoise(call.args));
        expect(
            unexpected,
            `unexpected console calls: ${JSON.stringify(unexpected)}`
        ).to.have.length(0);
    });
};

/**
 * Fails when the page does not fit its screen, naming the element that escapes or is cut off.
 *
 * @param label - what the report calls this state, such as the route's path
 */
export const assertFitsTheScreen = (label: string): void => {
    cy.checkLayout(label, { viewport: 'desktop', checks: ['overflow', 'clipped'] });
};

/**
 * Visits a route, asserts its page rendered, and that it was quiet and fit the viewport doing so.
 *
 * @param path - the route to open, locale prefix included
 * @param pageAnchor - a selector that exists once the page has rendered
 */
export const assertRouteIsHealthy = (path: string, pageAnchor: string): void => {
    visitCapturingConsole(path);
    cy.get(pageAnchor).should('exist');
    assertNoConsoleNoise();
    assertFitsTheScreen(path);
};
