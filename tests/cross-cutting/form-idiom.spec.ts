/**
 * Every form in this app is wired the same way, and there is one place that wiring lives.
 *
 * `useStructureFormValidation` is the toolkit's mechanism and it is deliberately ignorant of
 * vue-i18n, of Vuetify and of where a message goes — its own docblock says so. The consequence is
 * that a correct form here supplies the same three answers every time, and thirteen forms proved
 * that does not happen on its own: five shipped missing at least one, and two of those had
 * `showFormErrors` in scope and declared a `ref(false)` next to it instead.
 *
 * What broke was never a hard failure. A form missing `formElement` still shows its errors — it
 * just never moves focus, so a screen-reader user submits, hears nothing, and has no idea which
 * field to fix. That is invisible to every other test in this suite, which is what this file is
 * for.
 *
 * Two rules, and the second is what makes the first stick:
 *
 *   1. A view reaches the toolkit through `useAppForm`, never directly.
 *   2. A view does not keep its own "should I show errors yet" flag. The composable returns
 *      `showFormErrors`; a second one beside it can only disagree with it.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MODULES_ROOT = path.join(REPO_ROOT, 'src/modules');

/** Every `.vue` file a module ships, excluding its own specs. */
const componentFiles = (): string[] =>
    readdirSync(MODULES_ROOT, { withFileTypes: true, recursive: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.vue'))
        .map((entry) => path.relative(REPO_ROOT, path.join(entry.parentPath, entry.name)))
        .filter((file) => !file.split(path.sep).includes('tests'));

const sourceOf = (file: string): string => readFileSync(path.join(REPO_ROOT, file), 'utf8');

/** The files that build form state at all — the population both rules apply to. */
const formComponents = (): string[] =>
    componentFiles().filter((file) => /useAppForm|useStructureFormValidation/.test(sourceOf(file)));

/**
 * The argument list of every `useAppForm(...)` call in a file.
 *
 * Read by matching parentheses rather than by regex: a leftover `ref="formElement"` in the
 * template satisfies a whole-file search while the composable is handed nothing, and a generic
 * argument like `useAppForm<{ email?: string }>` contains characters that stop a naive scan.
 */
const appFormCallsOf = (source: string): string[] => {
    const calls: string[] = [];
    for (const { index: start } of source.matchAll(/useAppForm\s*[(<]/g)) {
        let depth = 0;
        for (let index = start; index < source.length; index++) {
            const character = source[index];
            if (character === '(') depth++;
            else if (character === ')' && --depth === 0) {
                calls.push(source.slice(start, index + 1));
                break;
            }
        }
    }
    return calls;
};

describe('one form idiom', () => {
    it('routes every form through useAppForm rather than the toolkit directly', () => {
        const direct = componentFiles().filter((file) =>
            sourceOf(file).includes('useStructureFormValidation')
        );

        expect(direct).toEqual([]);
    });

    it('lets the composable own whether errors are showing', () => {
        // `showFormErrors: showErrors` is a rename of the composable's own ref and is fine. A
        // `ref(false)` declared beside it is a second source of truth for one question.
        const ownFlag = formComponents().filter((file) =>
            /const\s+showErrors\s*=\s*ref\(/.test(sourceOf(file))
        );

        expect(ownFlag).toEqual([]);
    });

    /**
     * A page form focuses its first invalid field; that is the whole reason `formElement` exists.
     * Dialogs are exempt and stay exempt: one already traps focus, so moving focus inside it is a
     * different question from moving it on a page — see `use-app-form.ts`.
     */
    it('gives every page form an element to focus into', () => {
        const missing = formComponents()
            .filter((file) => !file.includes(`${path.sep}components${path.sep}`))
            .filter(
                (file) =>
                    !appFormCallsOf(sourceOf(file)).some((call) => call.includes('formElement'))
            );

        expect(missing).toEqual([]);
    });

    /** The guard on the guard: an empty population would satisfy all three. */
    it('is checking the forms it is meant to be checking', () => {
        expect(formComponents().length).toBeGreaterThan(10);
    });
});
