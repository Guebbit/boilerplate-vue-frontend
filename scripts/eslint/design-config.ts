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
import { DESIGN_POLICY } from '../design-policy';

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
 * The flat-config blocks for the Tailwind class rules, over `src/` templates and scripts.
 * Test files are left out: they hold fixtures, not styling.
 */
export const designLintConfig = () => [
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
                selectors: [...getDefaultSelectors(), CLASS_MAP_SELECTOR]
            }
        },
        rules: {
            'better-tailwindcss/enforce-canonical-classes': DESIGN_POLICY.severity.canonicalClasses,
            'better-tailwindcss/no-conflicting-classes': DESIGN_POLICY.severity.conflictingClasses,
            'better-tailwindcss/no-deprecated-classes': DESIGN_POLICY.severity.deprecatedClasses,
            'better-tailwindcss/no-duplicate-classes': DESIGN_POLICY.severity.duplicateClasses
        }
    }
];
