/**
 * `scripts/demo/demo-remove-tests.ts` — the specs that go with a removed module, and the header
 * check that keeps the step honest.
 *
 * Runs against a scratch tree of a few files rather than this checkout: the point is which files
 * a header or an import deletes, and which it leaves alone.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    headerProblems,
    removeResidueSpecs,
    requiredModules
} from '../../../../scripts/demo/demo-remove-tests';

/** The scratch checkout root, fresh per case. */
let root: string;

/** Write `content` at `relative` under the scratch root, creating the folders. */
const write = (relative: string, content: string): void => {
    const full = path.join(root, relative);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
};

beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'demo-remove-tests-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('requiredModules', () => {
    it('reads a comma list, trimming each name', () => {
        expect(requiredModules('// requires-module: cart,  orders\n')).toEqual(['cart', 'orders']);
    });

    it('reads `none` as no modules, not as a module called none', () => {
        expect(requiredModules('// requires-module: none\n')).toEqual([]);
    });

    it('answers undefined when there is no header, so "forgotten" differs from "none"', () => {
        expect(requiredModules('describe("x", () => {})')).toBeUndefined();
    });
});

describe('removeResidueSpecs', () => {
    it('deletes a spec whose header names a removed module, and keeps one that does not', () => {
        write('tests/e2e/specs/shop.cy.ts', '// requires-module: cart, orders\ndescribe("s")\n');
        write('tests/e2e/specs/account.cy.ts', '// requires-module: account\ndescribe("a")\n');
        write('tests/e2e/specs/no-header.cy.ts', 'describe("n")\n');

        const notes = removeResidueSpecs(root, ['cart']);

        expect(notes.map((note) => note.file)).toEqual(['tests/e2e/specs/shop.cy.ts']);
        expect(existsSync(path.join(root, 'tests/e2e/specs/shop.cy.ts'))).toBe(false);
        expect(existsSync(path.join(root, 'tests/e2e/specs/account.cy.ts'))).toBe(true);
        expect(existsSync(path.join(root, 'tests/e2e/specs/no-header.cy.ts'))).toBe(true);
    });

    it('deletes a spec in a subfolder, the way a journey sits', () => {
        write('tests/e2e/specs/journeys/cu1.cy.ts', '// requires-module: products\nit("x")\n');

        removeResidueSpecs(root, ['products']);

        expect(existsSync(path.join(root, 'tests/e2e/specs/journeys/cu1.cy.ts'))).toBe(false);
    });

    it('deletes a spec that imports a removed module even with no header', () => {
        write('tests/e2e/specs/x.cy.ts', "import { a } from '@/modules/cart/store';\n");
        write('tests/e2e/specs/y.cy.ts', "// import { a } from '@/modules/cart/store'\n");

        const notes = removeResidueSpecs(root, ['cart']);

        expect(notes.map((note) => note.file)).toEqual(['tests/e2e/specs/x.cy.ts']);
    });

    it('does nothing when there is no e2e folder', () => {
        expect(removeResidueSpecs(root, ['cart'])).toEqual([]);
    });
});

describe('headerProblems', () => {
    const known = ['cart', 'orders'];

    it('reports a journey with no header', () => {
        write('tests/e2e/specs/journeys/a.cy.ts', 'it("x")\n');

        expect(headerProblems(root, known)).toEqual([
            'tests/e2e/specs/journeys/a.cy.ts has no "// requires-module: a, b" (or "none") line.'
        ]);
    });

    it('accepts `none` and real module names in a journey', () => {
        write('tests/e2e/specs/journeys/a.cy.ts', '// requires-module: none\n');
        write('tests/e2e/specs/journeys/b.cy.ts', '// requires-module: cart, orders\n');

        expect(headerProblems(root, known)).toEqual([]);
    });

    it('reports a name that is not a module, anywhere under specs', () => {
        write('tests/e2e/specs/legacy.cy.ts', '// requires-module: cart, carts\n');

        expect(headerProblems(root, known)).toEqual([
            'tests/e2e/specs/legacy.cy.ts requires "carts", which is not a module.'
        ]);
    });

    it('does not demand a header outside journeys/', () => {
        write('tests/e2e/specs/keyboard.cy.ts', 'it("x")\n');

        expect(headerProblems(root, known)).toEqual([]);
    });
});
