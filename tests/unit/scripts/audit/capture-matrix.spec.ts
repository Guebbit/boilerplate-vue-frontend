/**
 * `scripts/audit/design-manual/scripts/capture-matrix.ts` — which shots a sweep case becomes.
 */
import { describe, expect, it } from 'vitest';
import {
    expandActionRow,
    expandActionRows,
    expandCase,
    expandCaptureCases,
    moduleOfSpec,
    slugOf,
    statesOfAction,
    withLocale
} from '../../../../scripts/audit/design-manual/scripts/capture-matrix';

describe('expandCase', () => {
    it('shoots a plain case at four sizes and themes', () => {
        const shots = expandCase({ name: 'Cart', hasPrepare: false }, 'cart');

        expect(shots.map(({ viewport, theme }) => `${viewport}·${theme}`)).toEqual([
            'phone·light',
            'phone·dark',
            'tablet·light',
            'desktop·light'
        ]);
    });

    it('skips a case that only pins a size or a theme', () => {
        expect(expandCase({ name: 'a', hasPrepare: false, viewport: 'phone' }, 'm')).toEqual([]);
        expect(expandCase({ name: 'a', hasPrepare: false, theme: 'dark' }, 'm')).toEqual([]);
    });

    it('shoots a prepared case pinned to a size once, at that size', () => {
        const shots = expandCase({ name: 'Drawer', hasPrepare: true, viewport: 'phone' }, 'shell');

        expect(shots).toHaveLength(1);
        expect(shots[0]).toMatchObject({ viewport: 'phone', theme: 'light' });
    });

    it('adds dark to a prepared case pinned to dark', () => {
        const shots = expandCase(
            { name: 'Drawer', hasPrepare: true, viewport: 'phone', theme: 'dark' },
            'shell'
        );

        expect(shots.map(({ theme }) => theme)).toEqual(['light', 'dark']);
    });

    it('shoots a prepared case with no size at phone and desktop', () => {
        const shots = expandCase({ name: 'Menu', hasPrepare: true }, 'shell');

        expect(shots.map(({ viewport }) => viewport)).toEqual(['phone', 'desktop']);
    });

    it('adds one phone shot per extra locale to a plain case', () => {
        const shots = expandCase({ name: 'Cart', hasPrepare: false }, 'cart', ['en', 'it']);

        expect(shots).toHaveLength(5);
        expect(shots.at(-1)).toMatchObject({
            id: 'cart--cart--phone--light--it',
            viewport: 'phone',
            theme: 'light',
            locale: 'it'
        });
    });

    it('does not add a locale shot to a prepared case', () => {
        expect(expandCase({ name: 'Menu', hasPrepare: true }, 'shell', ['en', 'it'])).toHaveLength(
            2
        );
    });
});

describe('expandCaptureCases', () => {
    it('gives every shot a stable, unique id', () => {
        const cases = expandCaptureCases(
            [
                { name: 'Cart page', hasPrepare: false },
                { name: 'Menu open', hasPrepare: true }
            ],
            'cart'
        );
        const ids = cases.flatMap(({ shots }) => shots.map(({ id }) => id));

        expect(new Set(ids).size).toBe(ids.length);
        expect(ids[0]).toBe('cart--cart-page--phone--light');
    });

    it('refuses two cases that slug to the same name', () => {
        expect(() =>
            expandCaptureCases(
                [
                    { name: 'Cart page', hasPrepare: false },
                    { name: 'cart-page', hasPrepare: false }
                ],
                'cart'
            )
        ).toThrow(RangeError);
    });
});

describe('slugOf, moduleOfSpec and withLocale', () => {
    it('slugs a label into lowercase words', () => {
        expect(slugOf('  Product — create (admin)! ')).toBe('product-create-admin');
    });

    it('names the module a spec belongs to, or the shell', () => {
        expect(moduleOfSpec('src/modules/orders/tests/e2e/a11y.cy.ts')).toBe('orders');
        expect(moduleOfSpec('tests/e2e/specs/a11y.cy.ts')).toBe('shell');
    });

    it('rewrites only the locale prefix', () => {
        expect(withLocale('/en/en-things', 'it')).toBe('/it/en-things');
        expect(withLocale('/en', 'it')).toBe('/it');
        expect(withLocale('/en/orders', 'en')).toBe('/en/orders');
    });
});

describe('statesOfAction', () => {
    it.each([
        ['read', ['loading', 'error']],
        ['empty', ['loading', 'empty']],
        ['form', ['error']],
        ['dialog', ['error']],
        ['row', ['error']],
        ['slow', []]
    ] as const)('a %s row is photographed in %j', (kind, states) => {
        expect(statesOfAction(kind)).toEqual(states);
    });
});

describe('expandActionRow', () => {
    it('shoots each state at phone and desktop, light only', () => {
        const shots = expandActionRow(
            { index: 3, name: 'A list read fails', kind: 'read' },
            'orders'
        );

        expect(shots.map(({ state, viewport, theme }) => `${state}·${viewport}·${theme}`)).toEqual([
            'loading·phone·light',
            'loading·desktop·light',
            'error·phone·light',
            'error·desktop·light'
        ]);
    });

    it('puts the module, the row index and the state in the id', () => {
        const [shot] = expandActionRow(
            { index: 3, name: 'A failed edit!', kind: 'form' },
            'orders'
        );

        expect(shot?.id).toBe('orders--row-3-a-failed-edit-error--phone--light');
    });

    it('cuts a long name at 48 characters and drops a dash left at the cut', () => {
        // 47 letters, a space (a dash once slugged), then more: the cut lands on the dash.
        const [shot] = expandActionRow(
            { index: 0, name: `${'a'.repeat(47)} tail`, kind: 'form' },
            'm'
        );

        expect(shot?.id).toBe(`m--row-0-${'a'.repeat(47)}-error--phone--light`);
    });

    it('gives a slow row no shots', () => {
        expect(expandActionRow({ index: 0, name: 'Slow', kind: 'slow' }, 'm')).toEqual([]);
    });
});

describe('expandActionRows', () => {
    it('keeps two rows with the same opening words apart by their index', () => {
        const rows = expandActionRows(
            [
                { name: 'x'.repeat(60), kind: 'form' },
                { name: 'x'.repeat(60), kind: 'form' }
            ],
            'm'
        );
        const ids = rows.flat().map(({ id }) => id);

        expect(new Set(ids).size).toBe(ids.length);
    });
});
