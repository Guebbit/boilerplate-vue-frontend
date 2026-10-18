/**
 * @module
 * Launching the Chrome Lighthouse measures, with the egress lock on.
 *
 * Nothing may leave the machine during an audit. `chrome-launcher` already adds its
 * `DEFAULT_FLAGS` (no background networking, component updates, sync, phishing checks), and two
 * more flags here refuse every hostname and every non-loopback address. The runner then checks the
 * `network-requests` audit as well (`evaluate.ts`).
 */
import { launch, type LaunchedChrome } from 'chrome-launcher';
import puppeteer, { type Browser } from 'puppeteer-core';

/** Hosts a request may name and still count as local. */
export const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'] as const;

/**
 * The Chrome command-line flags for an audit.
 *
 * @param root - whether the process runs as root (the CI container does), which Chrome refuses
 *   to sandbox
 */
export const chromeFlags = ({ root }: { root: boolean }): string[] => [
    '--headless=new',
    // Any hostname but loopback fails to resolve.
    // https://peter.sh/experiments/chromium-command-line-switches/#host-resolver-rules
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
    // Everything else (IP literals included) goes to a closed port; Chrome bypasses the proxy for
    // loopback by default.
    // https://peter.sh/experiments/chromium-command-line-switches/#proxy-server
    '--proxy-server=127.0.0.1:9',
    // Root cannot use Chrome's sandbox, and a container's /dev/shm is too small.
    ...(root ? ['--no-sandbox', '--disable-dev-shm-usage'] : [])
];

/** A launched Chrome and the Puppeteer handle attached to it. */
export interface AuditBrowser {
    /** The DevTools port Lighthouse connects to. */
    port: number;
    /** Puppeteer, attached over that port. */
    browser: Browser;
    /** Closes Puppeteer's connection and kills Chrome. */
    close: () => Promise<void>;
}

/**
 * Launches Chrome (`CHROME_PATH`, else `chrome-launcher`'s own search) and attaches Puppeteer.
 */
export const launchAuditBrowser = (): Promise<AuditBrowser> =>
    launch({
        chromeFlags: chromeFlags({ root: process.getuid?.() === 0 })
    }).then((chrome: LaunchedChrome) =>
        // `connect` attaches to the running Chrome; `launch` here would start a second one.
        // https://pptr.dev/api/puppeteer.puppeteer.connect
        puppeteer
            // `defaultViewport: null`: leave the size to Lighthouse's own emulation.
            .connect({
                browserURL: `http://127.0.0.1:${String(chrome.port)}`,
                defaultViewport: null
            })
            .then((browser) => ({
                port: chrome.port,
                browser,
                close: () => browser.disconnect().then(() => chrome.kill())
            }))
    );
