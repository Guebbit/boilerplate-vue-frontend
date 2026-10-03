/**
 * TL;DR — this is plain jsdom with one class of parser noise filtered out.
 *
 * Vuetify's stylesheets nest `@media` inside `@layer`, which jsdom's CSS parser cannot
 * read, so it prints "Could not parse CSS stylesheet" dozens of times per run. It is
 * harmless — jsdom keeps every rule it *could* parse — but it buries the warnings that
 * matter. Setting `css: false` would also silence it, at the price of never being able to
 * assert on computed styles; this keeps CSS fully on and suppresses only that one error
 * type. Everything else jsdom reports still comes through.
 *
 * Go back to `environment: 'jsdom'` in vitest.config.ts once the parser handles nested
 * at-rules inside `@layer`.
 */
import { builtinEnvironments } from 'vitest/runtime';
import { VirtualConsole } from 'jsdom';
// Type-only, so it is erased before it can hit the deprecated runtime export.
import type { Environment } from 'vitest/environments';

/** The `type` jsdom stamps on a CSS parse failure. */
const CSS_PARSING_ERROR = 'css-parsing';

/**
 * A jsdom `VirtualConsole` that forwards everything to the real console except CSS parse errors.
 * https://github.com/jsdom/jsdom#virtual-consoles
 */
const createFilteredConsole = () => {
    // jsdom swaps `globalThis.console` for its own on boot, and that one routes back
    // into this virtual console — resolve it lazily below and the message loops instead
    // of printing. Grab the real one while it is still the real one.
    const realConsole = globalThis.console;

    const virtualConsole = new VirtualConsole();

    // Forward console.* as usual; jsdomErrors are handled below so one type can be dropped.
    virtualConsole.forwardTo(realConsole, { jsdomErrors: 'none' });

    virtualConsole.on('jsdomError', (error: Error) => {
        // jsdom tags errors with `type`, which is not part of the Error typing.
        const { type, cause } = error as Error & { type?: string };

        if (type === CSS_PARSING_ERROR) {
            return;
        }
        if (type === 'unhandled-exception' && cause instanceof Error) {
            realConsole.error(cause.stack);
            return;
        }
        realConsole.error(error.message);
    });

    return virtualConsole;
};

/** Vitest's built-in jsdom environment, reused for everything but the console. */
const jsdomEnvironment = builtinEnvironments.jsdom;

// Built here rather than in vitest.config.ts: the config is serialized to the worker
// processes and a VirtualConsole is not cloneable. Vitest spreads these options after
// its own `virtualConsole`, so this one wins.
const withFilteredConsole = (options: Record<string, unknown>) => ({
    ...options,
    jsdom: {
        ...(options.jsdom as Record<string, unknown> | undefined),
        virtualConsole: createFilteredConsole()
    }
});

/**
 * Vitest custom environment: the built-in jsdom one with the filtered console injected.
 * `viteEnvironment: 'client'` makes Vite transform modules for the browser, as jsdom expects.
 * https://vitest.dev/guide/environment.html#custom-environment
 */
const environment: Environment = {
    name: 'jsdom-quiet-css',
    viteEnvironment: 'client',
    setup: (global, options) => jsdomEnvironment.setup(global, withFilteredConsole(options)),
    setupVM: (options) => jsdomEnvironment.setupVM!(withFilteredConsole(options))
};

/** The environment Vitest loads for the specs that name it. */
export default environment;
