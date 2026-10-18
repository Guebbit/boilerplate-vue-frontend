/**
 * @module
 * What the one `before:browser:launch` handler in `cypress.config.ts` does to a browser.
 *
 * Cypress keeps only the LAST handler registered for this event, so every launch tweak lives
 * here as a pure function and the config composes them. Two seams: the window size, and the
 * pointer a headless Chromium reports.
 */

/** A width and a height in CSS pixels. */
export interface WindowSize {
    width: number;
    height: number;
}

/** The slice of Cypress' `Browser` this module reads. */
export interface LaunchBrowser {
    name: string;
    family: string;
    isHeadless: boolean;
}

/** The slice of Cypress' `BrowserLaunchOptions` this module writes. */
export interface LaunchOptions {
    args: string[];
    preferences: Record<string, unknown>;
}

/**
 * The window that holds the largest width and the largest height of a set of viewports.
 *
 * Independent maxima, not the largest entry: the matrix's widest size and its tallest are
 * different entries, and a window smaller than either clips the shot.
 */
export const windowFor = (viewports: Record<string, WindowSize>): WindowSize => {
    const sizes = Object.values(viewports);
    return {
        width: Math.max(...sizes.map(({ width }) => width)),
        height: Math.max(...sizes.map(({ height }) => height))
    };
};

/**
 * Launch options with the browser window set to `size` — headless runs only.
 *
 * Without it a headless window is 1280×720, and Cypress clips a viewport-sized screenshot to it.
 * `cypress open` keeps the developer's own window; Firefox is left alone (no visual run).
 */
export const withWindowSize = <TOptions extends LaunchOptions>(
    browser: LaunchBrowser,
    launchOptions: TOptions,
    size: WindowSize
): TOptions => {
    if (!browser.isHeadless) return launchOptions;

    // Electron takes its window from BrowserWindow `preferences`, the recipe Cypress documents for
    // setting the screen size in headless runs.
    // https://docs.cypress.io/app/references/launching-browsers#Set-screen-size-when-running-headless
    if (browser.name === 'electron')
        return {
            ...launchOptions,
            preferences: { ...launchOptions.preferences, width: size.width, height: size.height }
        };

    // Chromium family: `--window-size=W,H` sets the initial window in CSS pixels.
    // https://peter.sh/experiments/chromium-command-line-switches/#window-size
    if (browser.family === 'chromium')
        return {
            ...launchOptions,
            args: [
                ...launchOptions.args,
                `--window-size=${String(size.width)},${String(size.height)}`
            ]
        };

    return launchOptions;
};

/**
 * Launch options that make a headless Chromium report a mouse, as Electron does.
 *
 * A headless Chromium has no pointing device, so it reports `hover: none` and no pointer, and
 * Vuetify's touch-only CSS renders at desktop width. These Blink settings give it a fine pointer
 * that can hover; the enums are Blink's `HoverType` (2 = can hover) and `PointerType` (4 = fine).
 * https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/public/common/css/
 *
 * Electron already reports a mouse, and Firefox has no such switch, so both are left alone.
 * Known limit: touch emulation, once turned off, falls back to "no pointer", not to these flags,
 * so a desktop test that follows a touch test in the same spec runs with no pointer.
 */
export const withDesktopPointer = <TOptions extends LaunchOptions>(
    browser: LaunchBrowser,
    launchOptions: TOptions
): TOptions => {
    if (browser.family !== 'chromium' || browser.name === 'electron') return launchOptions;

    return {
        ...launchOptions,
        args: [
            ...launchOptions.args,
            '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'
        ]
    };
};
