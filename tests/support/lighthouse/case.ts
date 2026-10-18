/**
 * @module
 * The shape of one Lighthouse case: a route, who looks at it, and what is known to fail.
 *
 * Cases live with their module (`src/modules/<name>/tests/lighthouse.ts`) so `npm run demo:remove`
 * takes them with the module; `tests/lighthouse/site.ts` holds the ones that belong to none.
 * How to add one: `docs/tools/lighthouse.md#cases-live-with-modules`.
 */
import type { Page } from 'puppeteer-core';
import type { E2ERole } from '../scenario-description';

/** The origin the audit build is served on (`vite preview`, the same port every e2e script uses). */
export const AUDIT_APP_ORIGIN = 'http://localhost:8085';

/** What a case's `prepare` is given. */
export interface PrepareContext {
    /** The app origin, {@link AUDIT_APP_ORIGIN}. */
    origin: string;
    /** Guarantee name → row id, from the backend's `/__test/scenario`. */
    subjects: Readonly<Record<string, string>>;
}

/** One page the audit loads. */
export interface LighthouseCase {
    /** `<module>/<name>`: the id in reports and in the baseline. */
    name: string;
    /** The app path; `{subject:product.rich}` is replaced by that row's id from `/__test/scenario`. */
    route: string;
    /** The seeded account to sign in as through the real form first; a guest when absent. */
    persona?: E2ERole;
    /** Drives the page like a person before the runs (add to cart, say). Runs once per case. */
    prepare?: (page: Page, context: PrepareContext) => Promise<void>;
    /**
     * Assert the SEO audits too. Opt-in, so a private page is never SEO-audited by accident
     * (a signed-in page and the cart are never crawled).
     */
    seo?: boolean;
    /**
     * Audit id → why it fails and is accepted. A stale exception, one whose audit passed in every
     * run, fails the audit run itself.
     */
    exceptions?: Readonly<Record<string, string>>;
}

/** The case fields the evaluation reads: what to assert, not how to reach the page. */
export type CaseRules = Pick<LighthouseCase, 'name' | 'seo' | 'exceptions'>;
