/**
 * `scripts/demo/demo-remove-registry.ts` — the registry edits a module removal makes.
 *
 * Runs against a scratch checkout of a few files rather than this one: the point is which lines
 * each edit drops and which it leaves alone.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    pruneModuleEdges,
    removeManifest,
    removeModuleFolders,
    stripModuleRegistry
} from '../../../../scripts/demo/demo-remove-registry';

/** The scratch checkout root, fresh per case. */
let root: string;

/** Write `content` at `relative` under the scratch root, creating the folders. */
const write = (relative: string, content: string): void => {
    const full = path.join(root, relative);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
};

/** Read a scratch file back. */
const read = (relative: string): string => readFileSync(path.join(root, relative), 'utf8');

beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), 'demo-remove-registry-'));
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

describe('removeModuleFolders', () => {
    it('deletes each named folder, keeps the others and names what it deleted', () => {
        write('src/modules/cart/module.ts', '');
        write('src/modules/account/module.ts', '');

        const deleted = removeModuleFolders(root, ['cart', 'wishlist']);

        expect(deleted).toEqual([
            path.join('src', 'modules', 'cart'),
            path.join('src', 'modules', 'wishlist')
        ]);
        expect(existsSync(path.join(root, 'src/modules/cart'))).toBe(false);
        expect(existsSync(path.join(root, 'src/modules/account/module.ts'))).toBe(true);
    });
});

describe('stripModuleRegistry', () => {
    it('drops the import and the array entry of a removed module, and only those', () => {
        write(
            'src/modules.ts',
            [
                "import account from '@/modules/account/module';",
                "import cart from '@/modules/cart/module';",
                'export const enabledModules = [',
                '    account,',
                '    cart,',
                '];'
            ].join('\n')
        );

        stripModuleRegistry(root, ['cart']);

        expect(read('src/modules.ts')).toBe(
            [
                "import account from '@/modules/account/module';",
                'export const enabledModules = [',
                '    account,',
                '];'
            ].join('\n')
        );
    });
});

describe('pruneModuleEdges', () => {
    const EDGES = [
        'export const MODULE_EDGES: Record<string, string[]> = {',
        "    account: ['users', 'addresses'],",
        "    cart: ['delivery', 'account'],",
        "    wishlist: ['cart', 'products']",
        '};'
    ].join('\n');

    it('drops the entry keyed by a removed module and keeps a value that names one', () => {
        write('scripts/module-edges.ts', EDGES);

        pruneModuleEdges(root, ['cart', 'wishlist']);

        expect(read('scripts/module-edges.ts')).toBe(
            [
                'export const MODULE_EDGES: Record<string, string[]> = {',
                "    account: ['users', 'addresses'],",
                '};'
            ].join('\n')
        );
    });

    it('keeps another module’s list even when it names the removed module', () => {
        write('scripts/module-edges.ts', EDGES);

        pruneModuleEdges(root, ['wishlist']);

        expect(read('scripts/module-edges.ts')).toContain("cart: ['delivery', 'account'],");
    });
});

describe('removeManifest', () => {
    it('deletes the manifest and its spec, naming both', () => {
        write('src/demo-modules.ts', '');
        write('tests/unit/demo-modules.spec.ts', '');

        const deleted = removeManifest(root);

        expect(deleted).toEqual([
            path.join('src', 'demo-modules.ts'),
            path.join('tests', 'unit', 'demo-modules.spec.ts')
        ]);
        expect(existsSync(path.join(root, 'src/demo-modules.ts'))).toBe(false);
    });
});
