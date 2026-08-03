/**
 * TL;DR — this is plain jsdom with one class of parser noise filtered out.
 *
 * Vuetify's stylesheets nest `@media` inside `@layer`, which jsdom's CSS parser cannot
 * read, so every run printed "Could not parse CSS stylesheet" 31 times. It is harmless
 * — jsdom keeps every rule it *could* parse — but it buried any warning that mattered.
 * Setting `css: false` would also silence it, at the price of never being able to assert
 * on computed styles; this keeps CSS fully on and suppresses only that one error type.
 * Everything else jsdom reports still comes through.
 *
 * Go back to `environment: 'jsdom'` in vitest.config.ts once the parser handles nested
 * at-rules inside `@layer`. See PROBLEM_17 for the full write-up.
 */
import { builtinEnvironments } from 'vitest/runtime';
import { VirtualConsole } from 'jsdom';
// Type-only, so it is erased before it can hit the deprecated runtime export.
import type { Environment } from 'vitest/environments';

const CSS_PARSING_ERROR = 'css-parsing';

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

const environment: Environment = {
    name: 'jsdom-quiet-css',
    viteEnvironment: 'client',
    setup: (global, options) => jsdomEnvironment.setup(global, withFilteredConsole(options)),
    setupVM: (options) => jsdomEnvironment.setupVM!(withFilteredConsole(options))
};

export default environment;
