/**
 * Every form in this app is wired the same way, even though there is no longer one composable
 * that forces it — `useAppForm` was removed as a thin wrapper around three answers a call site
 * can just as well supply itself. This file is what replaces it as the thing that forces them.
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
 * Three rules, and the third is what makes the first two stick:
 *
 *   1. Every `useStructureFormValidation(...)` call supplies `revalidateOn`, `invalidFieldSelector`
 *      and `onInvalid` — the three answers a call site would otherwise have to re-decide.
 *   2. A view does not keep its own "should I show errors yet" flag. The toolkit returns
 *      `showFormErrors`; a second one beside it can only disagree with it.
 *   3. A page form (not a dialog) hands it a `formElement`, so a failed submit has something to
 *      focus into.
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

/** The files that build form state at all — the population every rule applies to. */
const formComponents = (): string[] =>
    componentFiles().filter((file) => sourceOf(file).includes('useStructureFormValidation'));

/**
 * The argument list of every `useStructureFormValidation(...)` call in a file.
 *
 * Read by matching parentheses rather than by regex: a leftover `ref="formElement"` in the
 * template satisfies a whole-file search while the call itself is handed nothing, and a generic
 * argument like `useStructureFormValidation<{ email?: string }>` contains characters that stop a
 * naive scan.
 */
const formValidationCallsOf = (source: string): string[] => {
    const calls: string[] = [];
    for (const { index: start } of source.matchAll(/useStructureFormValidation\s*[(<]/g)) {
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
    it('gives every form the same three toolkit answers', () => {
        const incomplete = formComponents().filter((file) =>
            formValidationCallsOf(sourceOf(file)).some(
                (call) =>
                    !call.includes('revalidateOn') ||
                    !call.includes('invalidFieldSelector') ||
                    !call.includes('onInvalid')
            )
        );

        expect(incomplete).toEqual([]);
    });

    it('lets the toolkit own whether errors are showing', () => {
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
     * different question from moving it on a page.
     */
    it('gives every page form an element to focus into', () => {
        const missing = formComponents()
            .filter((file) => !file.includes(`${path.sep}components${path.sep}`))
            .filter(
                (file) =>
                    !formValidationCallsOf(sourceOf(file)).some((call) =>
                        call.includes('formElement')
                    )
            );

        expect(missing).toEqual([]);
    });

    /** The guard on the guard: an empty population would satisfy all three. */
    it('is checking the forms it is meant to be checking', () => {
        expect(formComponents().length).toBeGreaterThan(10);
    });
});
