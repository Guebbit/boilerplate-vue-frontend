/**
 * `scripts/docs/code-citations.ts` — the `docs/…` links cited outside `docs/`, run through the
 * same function `check-references.ts` calls, against a scratch tree and its file list.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deadCodeCitations } from '../../../scripts/docs/code-citations';

describe('deadCodeCitations', () => {
    /** A scratch tree, so the case controls exactly which pages and citing files exist. */
    let root: string;

    /** Writes `files` under the scratch root and returns the list `git ls-files` would give. */
    const track = async (files: Record<string, string>): Promise<string[]> => {
        for (const [file, text] of Object.entries(files)) {
            await mkdir(path.dirname(path.join(root, file)), { recursive: true });
            await writeFile(path.join(root, file), text);
        }
        return Object.keys(files);
    };

    beforeEach(async () => {
        root = await mkdtemp(path.join(os.tmpdir(), 'code-citations-'));
    });

    afterEach(() => rm(root, { recursive: true, force: true }));

    it('accepts a cited page and a cited anchor that is one of its headings', async () => {
        const files = await track({
            'docs/tools/umami.md': '# Umami\n\n## Who sends which event\n',
            'src/a.ts': '// See: docs/tools/umami.md#who-sends-which-event\n',
            '.env-example': '# docs/tools/umami.md\n'
        });

        expect(deadCodeCitations(root, files)).toEqual([]);
    });

    it('reports an anchor that no heading of the page answers to', async () => {
        const files = await track({
            'docs/tools/umami.md': '# Umami\n\n## Consent\n',
            'src/a.ts': '// See: docs/tools/umami.md#renamed-heading\n'
        });

        expect(deadCodeCitations(root, files)).toEqual([
            'src/a.ts: docs/tools/umami.md#renamed-heading'
        ]);
    });

    it('reports a page that does not exist, and ignores sentence punctuation after it', async () => {
        const files = await track({
            'docs/tools/umami.md': '# Umami\n',
            'scripts/x.ts': '// see docs/tools/gone.md#x.\n'
        });

        expect(deadCodeCitations(root, files)).toEqual(['scripts/x.ts: docs/tools/gone.md#x']);
    });

    it('leaves a URL, a backend page and a synced contract copy alone', async () => {
        const files = await track({
            'src/a.ts':
                '// https://example.com/docs/nope.md\n// boilerplate-node-backend/docs/tools/other.md#x\n',
            'contracts/openapi.yaml': 'description: docs/tools/gone.md\n'
        });

        expect(deadCodeCitations(root, files)).toEqual([]);
    });
});
