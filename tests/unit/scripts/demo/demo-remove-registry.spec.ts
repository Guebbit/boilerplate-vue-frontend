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

/** Read the scratch module registry back. */
const read = (): string => readFileSync(path.join(root, 'src/modules.ts'), 'utf8');

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
    it('drops the camel-cased entry of a hyphenated module', () => {
        write(
            'src/modules.ts',
            [
                "import cart from '@/modules/cart/module';",
                "import stockAlerts from '@/modules/stock-alerts/module';",
                'export const enabledModules = [',
                '    cart,',
                '    stockAlerts,',
                '];'
            ].join('\n')
        );

        stripModuleRegistry(root, ['stock-alerts']);

        expect(read()).toBe(
            [
                "import cart from '@/modules/cart/module';",
                'export const enabledModules = [',
                '    cart,',
                '];'
            ].join('\n')
        );
    });

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

        expect(read()).toBe(
            [
                "import account from '@/modules/account/module';",
                'export const enabledModules = [',
                '    account,',
                '];'
            ].join('\n')
        );
    });
});
