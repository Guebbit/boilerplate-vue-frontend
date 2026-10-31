/**
 * @module
 * The backend links into this router from mail and from its sitemap. This walks every one of those
 * paths (`contracts/frontend-links.yaml`, handed over by `sync:frontend`) against the real router,
 * so a renamed route fails here instead of as a 404 in a reader's inbox.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

// The router's guards are not under test: `resolve` never runs them, but importing the router
// pulls the modules in, so the two it imports at load are stubbed as `router.spec.ts` stubs them.
vi.mock('@/app/guards/authentications.ts', () => ({
    tryRestoreAuth: () => Promise.resolve(),
    enforceRouteAccess: () => undefined
}));
vi.mock('@/infrastructure/observability/store.ts', () => ({
    useObservabilityStore: () => ({ captureException: vi.fn() })
}));

/** The parsed `contracts/frontend-links.yaml`. */
const rules = parse(
    readFileSync(path.join(process.cwd(), 'contracts', 'frontend-links.yaml'), 'utf8')
) as {
    links: Record<string, string>;
    staffPages: Record<string, string>;
    staticPages: string[];
};

/** Pay for the router's module graph once, outside any test's budget (see `router.spec.ts`). */
beforeAll(async () => {
    await import('@/app/router');
}, 60_000);

/**
 * Whether `/en/<template>` lands on a real page, not on a catch-all.
 * @param template - a backend link template, with `{id}` / `{token}` placeholders
 */
const resolvesToAPage = async (template: string): Promise<boolean> => {
    const { default: router } = await import('@/app/router');
    // The fragment and the query are the reader's business; only the path has to exist.
    const [route] = template.replaceAll(/{\w+}/g, 'x').split(/[#?]/);
    const resolved = router.resolve(route ? `/en/${route}` : '/en');
    return (
        resolved.matched.length > 0 &&
        !resolved.matched.some((record) => record.path.includes('catchAll'))
    );
};

describe('backend links resolve on the router', () => {
    it('every link template is a real page', async () => {
        const kinds = Object.keys(rules.links);
        expect(kinds.length).toBeGreaterThan(0);
        for (const kind of kinds)
            expect([kind, await resolvesToAPage(rules.links[kind])]).toEqual([kind, true]);
    });

    it('every staff screen a notice mail links to is a real page', async () => {
        const kinds = Object.keys(rules.staffPages);
        expect(kinds).toHaveLength(9);
        for (const kind of kinds)
            expect([kind, await resolvesToAPage(rules.staffPages[kind])]).toEqual([kind, true]);
    });

    it('every static sitemap page is a real page', async () => {
        expect(rules.staticPages.length).toBeGreaterThan(0);
        for (const page of rules.staticPages)
            expect([page, await resolvesToAPage(page)]).toEqual([page, true]);
    });
});
