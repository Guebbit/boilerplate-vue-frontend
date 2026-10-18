/**
 * `scripts/audit/design-manual/scripts/capture-scope.ts` — a typed scope becomes sweep specs.
 */
import { describe, expect, it } from 'vitest';
import { scopeToSpecs } from '../../../../scripts/audit/design-manual/scripts/capture-scope';

const modules = ['cart', 'orders'];
const none = (): boolean => false;
const onlyCartActions = (file: string): boolean =>
    file === 'src/modules/cart/tests/e2e/actions.cy.ts';

describe('scopeToSpecs', () => {
    it('runs the shell and every module for an empty scope', () => {
        expect(scopeToSpecs({ scope: '', modules, exists: none }).specs).toEqual([
            'tests/e2e/specs/a11y.cy.ts',
            'src/modules/cart/tests/e2e/a11y.cy.ts',
            'src/modules/orders/tests/e2e/a11y.cy.ts'
        ]);
    });

    it('runs one module, and the shell by name', () => {
        expect(scopeToSpecs({ scope: 'cart', modules, exists: none }).specs).toEqual([
            'src/modules/cart/tests/e2e/a11y.cy.ts'
        ]);
        expect(scopeToSpecs({ scope: 'shell', modules, exists: none }).specs).toEqual([
            'tests/e2e/specs/a11y.cy.ts'
        ]);
    });

    it('resolves a path to the module that owns it', () => {
        expect(
            scopeToSpecs({
                scope: 'src/modules/orders/views/Orders.vue',
                modules,
                exists: none
            }).specs
        ).toEqual(['src/modules/orders/tests/e2e/a11y.cy.ts']);
    });

    it('includes actions.cy.ts only when it exists', () => {
        const exists = onlyCartActions;

        expect(scopeToSpecs({ scope: 'cart', modules, exists }).specs).toEqual([
            'src/modules/cart/tests/e2e/a11y.cy.ts',
            'src/modules/cart/tests/e2e/actions.cy.ts'
        ]);
        expect(scopeToSpecs({ scope: 'orders', modules, exists }).specs).toHaveLength(1);
    });

    it('takes the modules a diff touches', () => {
        const result = scopeToSpecs({
            scope: '--diff',
            modules,
            exists: none,
            changedFiles: ['src/modules/orders/views/Orders.vue', 'README.md']
        });

        expect(result).toEqual({
            specs: ['src/modules/orders/tests/e2e/a11y.cy.ts'],
            widened: false
        });
    });

    it('widens a diff that reaches shared chrome to everything', () => {
        const result = scopeToSpecs({
            scope: '--diff',
            modules,
            exists: none,
            changedFiles: ['src/ui/vuetify/index.ts']
        });

        expect(result.widened).toBe(true);
        expect(result.specs).toHaveLength(3);
    });

    it('refuses a diff with no module and a scope that names nothing', () => {
        expect(() =>
            scopeToSpecs({ scope: '--diff', modules, exists: none, changedFiles: ['README.md'] })
        ).toThrow(RangeError);
        expect(() => scopeToSpecs({ scope: 'nope', modules, exists: none })).toThrow(RangeError);
    });
});
