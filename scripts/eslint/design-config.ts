/**
 * @module
 * The Tailwind half of the design lint, as flat-config blocks for `eslint.config.ts`.
 *
 * What it reads live: `src/styles/main.css` (the Tailwind `@theme`), so a token added there is a
 * valid class at once and the canonicaliser rewrites an equal arbitrary value into it. The knobs
 * (severities, root font size) come from `scripts/design-policy.ts`.
 *
 * Stylistic rules stay off (class order, line wrapping, variable syntax): they are formatting,
 * not design, and turning them on reflows the whole tree for no design signal.
 */
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults';
import { MatcherType, SelectorKind } from 'eslint-plugin-better-tailwindcss/types';
import { DESIGN_POLICY, type DesignSeverity } from '../design-policy';
import { ignorePatterns, readStylesheetClasses } from './stylesheet-classes';

/**
 * The repo root, where `src/` lives. ESLint runs from here (the plugin's `entryPoint` is relative
 * to it too), and a spec under jsdom has no `file:` URL to derive it from.
 */
const REPO_ROOT = process.cwd();

/**
 * Class maps hoisted to a top-level `const NAME_CLASSES = {…} as const`.
 * The plugin cannot see a string inside `computed(() => ({…})[key])`, but it reads every string
 * of a variable whose name ends in `CLASSES` (the plugin matches the whole name, hence the `.*`), and every value of an object assigned to one.
 */
const CLASS_MAP_SELECTOR = {
    kind: SelectorKind.Variable,
    name: '.*CLASSES',
    match: [{ type: MatcherType.String }, { type: MatcherType.ObjectValue }]
};

/**
 * A component prop that carries classes, by naming convention (`rounded-class`, `roundedClass`).
 * The plugin reads `class` only unless told: a class handed through a prop would go unlinted.
 */
const CLASS_PROP_SELECTOR = {
    kind: SelectorKind.Attribute,
    name: '.*(?:-class|Class)',
    match: [{ type: MatcherType.String }]
};

/**
 * The flat-config blocks for the Tailwind class rules, over `src/` templates and scripts.
 * Test files are left out: they hold fixtures, not styling.
 *
 * `no-unknown-classes` gets the app's own stylesheet classes as its `ignore` list, read from the
 * CSS on every run. A scoped class is added only to its own SFC's block, because its CSS reaches
 * nowhere else.
 */
export const designLintConfig = () => {
    const stylesheets = readStylesheetClasses(REPO_ROOT);
    const globalIgnore = [
        ...ignorePatterns(stylesheets.global),
        ...DESIGN_POLICY.vuetifyOwnedClasses
    ];
    /**
     * The refused classes: the policy's list, then every ambiguous utility it marks restricted.
     * The plugin's `restrict` takes `{ pattern, message }` objects, first match wins.
     */
    const restrictedClasses = [
        ...DESIGN_POLICY.restrictedClasses,
        ...DESIGN_POLICY.ambiguousUtilities
            .filter((entry) => entry.restrict)
            .map((entry) => ({
                // The policy pattern is anchored over the bare name; a variant (`md:`) may precede it.
                pattern: entry.pattern.replace(/^\^/, '(?:^|:)'),
                message: entry.message
            }))
    ];
    /** The rule entry for a list of ignored class patterns. */
    const unknownClassesRule = (ignore: string[]): [DesignSeverity, { ignore: string[] }] => [
        DESIGN_POLICY.severity.unknownClasses,
        { ignore }
    ];

    return [
        {
            files: ['src/**/*.{ts,vue}'],
            ignores: ['src/**/tests/**', 'src/**/*.spec.ts'],
            plugins: { 'better-tailwindcss': betterTailwind },
            settings: {
                'better-tailwindcss': {
                    // The stylesheet whose `@theme` defines the tokens; read live by the plugin.
                    entryPoint: DESIGN_POLICY.tailwindEntryPoint,
                    // Rem-to-px for the canonicaliser: `max-w-[1280px]` equals `max-w-7xl` at 16.
                    rootFontSize: DESIGN_POLICY.rootFontSize,
                    // Treat a class defined in our own CSS as known rather than reporting it.
                    detectComponentClasses: true,
                    selectors: [...getDefaultSelectors(), CLASS_MAP_SELECTOR, CLASS_PROP_SELECTOR]
                }
            },
            rules: {
                'better-tailwindcss/enforce-canonical-classes':
                    DESIGN_POLICY.severity.canonicalClasses,
                'better-tailwindcss/no-conflicting-classes':
                    DESIGN_POLICY.severity.conflictingClasses,
                'better-tailwindcss/no-deprecated-classes':
                    DESIGN_POLICY.severity.deprecatedClasses,
                'better-tailwindcss/no-duplicate-classes': DESIGN_POLICY.severity.duplicateClasses,
                'better-tailwindcss/no-restricted-classes': [
                    DESIGN_POLICY.severity.restrictedClasses,
                    { restrict: restrictedClasses }
                ],
                'better-tailwindcss/no-unknown-classes': unknownClassesRule(globalIgnore)
            }
        },
        // Rule options replace, they do not merge: a scoped block repeats the global list.
        ...[...stylesheets.scopedByFile].map(([file, scoped]) => ({
            files: [file],
            rules: {
                'better-tailwindcss/no-unknown-classes': unknownClassesRule([
                    ...globalIgnore,
                    ...ignorePatterns(scoped)
                ])
            }
        }))
    ];
};
