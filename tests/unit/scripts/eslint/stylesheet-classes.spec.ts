/**
 * `scripts/eslint/stylesheet-classes` reads the app's own CSS classes, so `no-unknown-classes`
 * can tell a class the app styles from a typo. A global class is valid everywhere; a scoped one
 * only in its own SFC.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    classesOfCss,
    ignorePatterns,
    readStylesheetClasses
} from '../../../../scripts/eslint/stylesheet-classes';

describe('classesOfCss', () => {
    it('collects class selectors, :deep(...) and nested rules included', () => {
        expect(
            [
                ...classesOfCss(
                    '.skip-link:focus-visible{} a .b-c, .d{} :deep(.inner){} @media (min-width:1px){.e{}}'
                )
            ].toSorted()
        ).toEqual(['b-c', 'd', 'e', 'inner', 'skip-link']);
    });

    it('ignores numbers in values and type selectors', () => {
        expect(classesOfCss('a{margin:0.5rem} div{}').size).toBe(0);
    });
});

describe('readStylesheetClasses', () => {
    /** A throwaway repo root with one global CSS file and three SFCs. */
    const root = mkdtempSync(path.join(tmpdir(), 'stylesheet-classes-'));
    mkdirSync(path.join(root, 'src/styles'), { recursive: true });
    mkdirSync(path.join(root, 'src/ui'), { recursive: true });
    writeFileSync(path.join(root, 'src/styles/main.css'), '.skip-link{}');
    writeFileSync(
        path.join(root, 'src/ui/Scoped.vue'),
        '<template><p class="mine" /></template><style scoped>.mine{} :deep(.child){}</style>'
    );
    writeFileSync(
        path.join(root, 'src/ui/Plain.vue'),
        '<template><p /></template><style>.shared{}</style>'
    );
    writeFileSync(path.join(root, 'src/ui/NoStyle.vue'), '<template><p /></template>');
    const found = readStylesheetClasses(root);

    it('treats CSS files and unscoped style blocks as global', () => {
        expect([...found.global].toSorted()).toEqual(['shared', 'skip-link']);
    });

    it('keeps a scoped class to its own file', () => {
        expect([...(found.scopedByFile.get('src/ui/Scoped.vue') ?? [])].toSorted()).toEqual([
            'child',
            'mine'
        ]);
        expect(found.scopedByFile.has('src/ui/Plain.vue')).toBe(false);
        expect(found.global.has('mine')).toBe(false);
    });
});

describe('ignorePatterns', () => {
    it('anchors and escapes each name', () => {
        const [pattern] = ignorePatterns(['a.b']);
        expect(pattern).toBe(String.raw`^a\.b$`);
        expect(new RegExp(pattern ?? '').test('aXb')).toBe(false);
    });
});
