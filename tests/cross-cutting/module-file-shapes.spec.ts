/**
 * A form schema restates no bound the contract declares.
 *
 * A size bound the contract declares arrives as a generated constant, so a literal in a module's
 * `schemas.ts` is a second copy that drifts silently from the backend. The sweep walks every
 * module folder to find those files.
 *
 * See: docs/theory/modules.md
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enabledModules } from '@/modules';

/** Where every module lives. */
const MODULES_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/modules');

/** Every file under `directory`, as paths relative to it, sorted. */
const walk = (directory: string, base = directory): string[] => {
    if (!existsSync(directory)) return [];
    return readdirSync(directory)
        .flatMap((entry) => {
            const full = path.join(directory, entry);
            return statSync(full).isDirectory() ? walk(full, base) : [path.relative(base, full)];
        })
        .toSorted();
};

/** Every module-relative file path, paired with the module it belongs to. */
const filesInModules = (): { module: string; file: string }[] =>
    enabledModules.flatMap((appModule) =>
        walk(path.join(MODULES_ROOT, appModule.name)).map((file) => ({
            module: appModule.name,
            file
        }))
    );

/** Every module's `schemas.ts`, with its text. */
const schemaFiles = () =>
    filesInModules()
        .filter(({ file }) => file === 'schemas.ts')
        .map(({ module, file }) => ({
            where: `src/modules/${module}/${file}`,
            source: readFileSync(path.join(MODULES_ROOT, module, file), 'utf8')
        }));

describe('a form schema restates no bound the contract declares', () => {
    /**
     * A size bound written as a number: `.max(255)`, `.min(8)`, `.length(6)`. A bound the contract
     * declares arrives as a generated constant (`createWebhookSubscriptionBodyUrlMax`), so a
     * literal here is a second copy that drifts. `.min(1)` is the one literal allowed: "empty means
     * missing", which carries the field's own translated message.
     */
    const LITERAL_BOUND = /\.(min|max|length|gte|lte|gt|lt)\(\s*(\d[\d._]*)/g;

    it('finds the schema files it means to check', () => {
        expect(schemaFiles().length).toBeGreaterThanOrEqual(10);
    });

    it('writes no size bound as a number (a generated constant says it)', () => {
        const literals = schemaFiles().flatMap(({ where, source }) =>
            [...source.matchAll(LITERAL_BOUND)]
                .filter(([, method, value]) => !(method === 'min' && value === '1'))
                .map(([call]) => `${where}: ${call.trim()}…`)
        );

        expect(literals).toEqual([]);
    });
});
