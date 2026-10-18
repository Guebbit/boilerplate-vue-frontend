/**
 * `scripts/audit/design-manual/scripts/plan-batches.ts` — a capture is split into reviewable batches.
 */
import { describe, expect, it } from 'vitest';
import type { DesignShot } from '../../../../scripts/audit/design-manual/scripts/manifest';
import { planBatches } from '../../../../scripts/audit/design-manual/scripts/plan-batches';

/** A shot of `module`'s case `caseName`, holding `tiles` tiles of `tokens` tokens each. */
const shotOf = (
    module: string,
    caseName: string,
    id: string,
    tiles = 1,
    tokens = 1000
): DesignShot => ({
    id,
    module,
    spec: `src/modules/${module}/tests/e2e/a11y.cy.ts`,
    caseName,
    route: '/en/x',
    role: 'anonymous',
    viewport: 'phone',
    size: [390, 844],
    touch: true,
    theme: 'light',
    locale: 'en',
    state: 'first-paint',
    tiles: Array.from({ length: tiles }, (_, index) => ({
        path: `reports/${id}-${String(index)}.png`,
        width: 390,
        height: 800,
        offsetY: index * 760,
        estimatedTokens: tokens
    })),
    page: {
        height: 800,
        scrollWidth: 390,
        clientWidth: 390,
        bandTop: 56,
        bandBottom: 0,
        stickyRepeats: false
    },
    fixed: [],
    inputs: [],
    headings: []
});

const budget = { imageTokens: 3000, tiles: 20 };

describe('planBatches', () => {
    it('groups the shots of one module together', () => {
        const { batches } = planBatches(
            {
                shots: [
                    shotOf('orders', 'list', 'a'),
                    shotOf('cart', 'view', 'b'),
                    shotOf('orders', 'detail', 'c')
                ]
            },
            budget
        );

        expect(batches.map(({ name, shotIds }) => [name, shotIds])).toEqual([
            ['orders', ['a', 'c']],
            ['cart', ['b']]
        ]);
    });

    it('splits a module once the next case would pass the token budget', () => {
        const { batches } = planBatches(
            {
                shots: [
                    shotOf('orders', 'one', 'a', 1, 1800),
                    shotOf('orders', 'two', 'b', 1, 1800)
                ]
            },
            budget
        );

        expect(batches.map(({ name, shotIds }) => [name, shotIds])).toEqual([
            ['orders-1', ['a']],
            ['orders-2', ['b']]
        ]);
    });

    it('splits a module once the next case would pass the tile budget', () => {
        const { batches } = planBatches(
            { shots: [shotOf('orders', 'one', 'a', 2, 1), shotOf('orders', 'two', 'b', 2, 1)] },
            { imageTokens: 60_000, tiles: 3 }
        );

        expect(batches).toHaveLength(2);
    });

    it('never splits one case, even when the case alone passes the budget', () => {
        const first = shotOf('orders', 'wide', 'phone', 1, 2500);
        const second = {
            ...shotOf('orders', 'wide', 'desktop', 1, 2500),
            viewport: 'desktop' as const
        };

        const { batches } = planBatches({ shots: [first, second] }, budget);

        expect(batches).toHaveLength(1);
        expect(batches[0]?.shotIds).toEqual(['phone', 'desktop']);
    });

    it('adds up the tiles and the tokens of a batch', () => {
        const { batches } = planBatches({ shots: [shotOf('orders', 'one', 'a', 3, 400)] }, budget);

        expect(batches[0]).toMatchObject({ tileCount: 3, estimatedTokens: 1200 });
    });

    it('gives an empty manifest no batches and says why', () => {
        const plan = planBatches({ shots: [] });

        expect(plan.batches).toEqual([]);
        expect(plan.problem).toMatch(/nothing was captured/);
    });
});
