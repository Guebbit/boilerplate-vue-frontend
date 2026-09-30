/**
 * The docs' claims about scripts, dependencies and the contract — `scripts/docs/document-facts.ts`, the
 * pure half of `check:docs-references`. Each rule is driven with a fixture page, so a rule that
 * stopped seeing what it is for fails here rather than passing a tree it can no longer read.
 */
import { describe, expect, it } from 'vitest';
import {
    exportedNames,
    fencedContractImports,
    listedPackages,
    missingScripts,
    npmScriptsCited,
    staleListings,
    unknownContractImports,
    unnamedOn
} from '../../../scripts/docs/document-facts';

describe('npmScriptsCited / missingScripts', () => {
    it('reads a script from prose, an inline span and a fence, and drops the argument list', () => {
        const text = 'Run `npm run test:unit -- src/x` or\n```sh\nnpm run lint:fix\n```';

        expect(npmScriptsCited(text)).toEqual(['test:unit', 'lint:fix']);
    });

    it('flags a script that exists nowhere, and only that one', () => {
        const pages = [{ path: 'docs/a.md', text: '`npm run test:module` and `npm run lint`' }];

        expect(missingScripts(pages, new Set(['lint']))).toEqual([
            { page: 'docs/a.md', problem: '`npm run test:module` is not a script' }
        ]);
    });
});

describe('unnamedOn', () => {
    it('counts each name in a "`a` / `b`" cell, and reports the one left out', () => {
        const page = { path: 'docs/scripts.md', text: '| `lint` / `lint:fix` | x |' };

        expect(unnamedOn(page, ['lint', 'lint:fix', 'build'], 'script')).toEqual([
            { page: 'docs/scripts.md', problem: 'script `build` is not listed' }
        ]);
    });
});

describe('listedPackages / staleListings', () => {
    const table = [
        '| Group | Packages | Why |',
        '| --- | --- | --- |',
        '| Vue | `vue`, `@scope/pkg` | a `not-a-package thing` in prose |'
    ].join('\n');

    it('reads only the Packages cell, and only package-shaped spans', () => {
        expect(listedPackages(table)).toEqual(['vue', '@scope/pkg']);
    });

    it('flags a listed package that is not installed', () => {
        expect(staleListings({ path: 'docs/deps.md', text: table }, new Set(['vue']))).toEqual([
            { page: 'docs/deps.md', problem: 'lists `@scope/pkg`, which is not installed' }
        ]);
    });
});

describe('contract imports in a code fence', () => {
    const text = [
        'Prose mentioning `import { NotInFence } from "@api"` is not a fence.',
        '```ts',
        "import { listProducts, type Product as P } from '@api';",
        "import { CreateProductBody } from '@api/schemas';",
        '```'
    ].join('\n');

    it('reads bindings, dropping the `type` marker and any alias', () => {
        expect(fencedContractImports(text)).toEqual([
            { from: '@api', name: 'listProducts' },
            { from: '@api', name: 'Product' },
            { from: '@api/schemas', name: 'CreateProductBody' }
        ]);
    });

    it('flags a name the contract does not export', () => {
        const findings = unknownContractImports([{ path: 'docs/api.md', text }], {
            '@api': new Set(['listProducts']),
            '@api/schemas': new Set(['CreateProductBody'])
        });

        expect(findings).toEqual([
            {
                page: 'docs/api.md',
                problem: "imports `Product` from '@api', which does not export it"
            }
        ]);
    });
});

describe('exportedNames', () => {
    it('reads every kind of top-level export orval emits', () => {
        const source = [
            'export interface Product {}',
            'export type Id = string;',
            'export const listProducts = () => 1;',
            'export const Enum = {} as const;',
            '    export const nested = 1;'
        ].join('\n');

        expect([...exportedNames(source)]).toEqual(['Product', 'Id', 'listProducts', 'Enum']);
    });
});
