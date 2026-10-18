/**
 * @module
 * The I/O half of the runner: drives Chrome through every case and hands back the reports.
 *
 * Each case gets its own browser context, so a signed-in case never leaks its cookies into the
 * next one. A persona signs in through the real login form; `prepare` then drives the page like a
 * person; then Lighthouse measures N times. Lighthouse 13 keeps cookies and storage across runs but
 * clears the HTTP cache, so each run is the cold-cache load of a signed-in visitor.
 */
import lighthouse, { type Result } from 'lighthouse';
import type { Page } from 'puppeteer-core';
import type { LighthouseCase } from '../../tests/support/lighthouse/case';
import { AUDIT_APP_ORIGIN } from '../../tests/support/lighthouse/case';
import type { ScenarioDescription } from '../../tests/support/scenario-description';
import type { AuditBrowser } from './chrome';
import type { Report } from './evaluate';
import { resolveRoute } from './route';
import { lighthouseFlags } from './settings';

/** One measured run: the report to judge and the HTML a person reads. */
export interface MeasuredRun {
    /** What `evaluate` reads. */
    report: Report;
    /** The full Lighthouse result, written as `run-<n>.json`. */
    lhr: Result;
    /** The HTML report. */
    html: string;
}

/**
 * Signs in through the real form, the way `submitLoginForm` does in the Cypress support.
 *
 * @param page - a fresh page of the case's context
 * @param credentials - the seeded account
 */
const signIn = (page: Page, credentials: { email: string; password: string }): Promise<void> =>
    page
        .goto(`${AUDIT_APP_ORIGIN}/en/login`)
        .then(() => page.waitForSelector('[type=email]'))
        .then(() => page.type('[type=email]', credentials.email))
        .then(() => page.type('[type=password]', credentials.password))
        // Submit the form itself: the same event a person's Enter key raises.
        .then(() =>
            page.$eval('form', (form) => {
                form.requestSubmit();
            })
        )
        // Puppeteer: poll in the page until the address has left /login.
        // https://pptr.dev/api/puppeteer.page.waitforfunction
        .then(() => page.waitForFunction(() => !location.pathname.includes('/login')))
        .then(() => undefined);

/**
 * Narrows a Lighthouse result to what `evaluate` reads.
 *
 * The details of an audit are a union of table shapes; only `network-requests` rows are read, and
 * they carry a `url`, which is why the cast on `details` is safe.
 */
const toReport = (lhr: Result): Report => ({
    finalDisplayedUrl: lhr.finalDisplayedUrl,
    runtimeError: lhr.runtimeError,
    audits: Object.fromEntries(
        Object.entries(lhr.audits).map(([id, audit]) => [
            id,
            {
                score: audit.score,
                scoreDisplayMode: audit.scoreDisplayMode,
                numericValue: audit.numericValue,
                details: audit.details as { items?: readonly { url?: string }[] } | undefined
            }
        ])
    ),
    categories: Object.fromEntries(
        Object.entries(lhr.categories).map(([id, category]) => [
            id,
            { score: category.score, auditRefs: category.auditRefs }
        ])
    ),
    environment: { benchmarkIndex: lhr.environment.benchmarkIndex }
});

/**
 * One Lighthouse run of `url` on `page`.
 */
const measureOnce = (page: Page, url: string, port: number): Promise<MeasuredRun> =>
    // lighthouse(url, flags, config, page): the page is the one already signed in; no config means
    // Lighthouse's default (mobile) with the flags layered on top.
    // https://github.com/GoogleChrome/lighthouse/blob/main/docs/puppeteer.md
    lighthouse(url, lighthouseFlags(port), undefined, page).then((result) => {
        if (!result) throw new Error(`Lighthouse returned nothing for ${url}`);
        const html = Array.isArray(result.report) ? result.report[0] : result.report;
        return { report: toReport(result.lhr), lhr: result.lhr, html };
    });

/** Runs `step` for `count` rounds, one after the other (Lighthouse runs must never overlap). */
const sequentially = async <T>(count: number, step: () => Promise<T>): Promise<T[]> => {
    const results: T[] = [];
    for (let round = 0; round < count; round++) results.push(await step());
    return results;
};

/**
 * Measures one case: sign in, prepare, then `runs` times.
 *
 * @param audit - the case
 * @param scenario - what the backend seeded
 * @param browser - the launched Chrome
 * @param runs - how many measured runs
 */
export const collectCase = (
    audit: LighthouseCase,
    scenario: ScenarioDescription,
    browser: AuditBrowser,
    runs: number
): Promise<MeasuredRun[]> =>
    browser.browser.createBrowserContext().then((context) =>
        context
            .newPage()
            .then((page) => {
                const account = audit.persona ? scenario.accounts[audit.persona] : undefined;
                if (audit.persona && !account)
                    throw new Error(
                        `${audit.name}: the backend seeded no "${audit.persona}" account`
                    );
                return (account ? signIn(page, account) : Promise.resolve())
                    .then(() =>
                        audit.prepare?.(page, {
                            origin: AUDIT_APP_ORIGIN,
                            subjects: scenario.subjects
                        })
                    )
                    .then(() =>
                        sequentially(runs, () =>
                            measureOnce(
                                page,
                                `${AUDIT_APP_ORIGIN}${resolveRoute(audit.route, scenario.subjects)}`,
                                browser.port
                            )
                        )
                    );
            })
            .finally(() => context.close())
    );
