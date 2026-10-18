/**
 * The Tailwind half of the design lint, run for real on snippets: the plugin must find
 * `src/styles/main.css`, read its `@theme`, and reach a class map hoisted to a `*_CLASSES` const.
 *
 * If the stylesheet path ever breaks, every theme class turns "unknown" or "non-canonical" and
 * these cases go red first, instead of the lint going quiet.
 */
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import pluginVue from 'eslint-plugin-vue';
import { designLintConfig } from '../../../scripts/eslint/design-config';

/** An ESLint over the design blocks, with the Vue parser and the unused-disable reporting on. */
const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
        ...pluginVue.configs['flat/base'],
        {
            linterOptions: { reportUnusedDisableDirectives: 'error' },
            rules: { 'vue/comment-directive': ['error', { reportUnusedDisableDirectives: true }] }
        },
        ...designLintConfig()
    ]
});

/** Lints a `<template>` snippet as a file under `src/` and returns the rule ids reported. */
const ruleIdsOf = async (template: string, script = ''): Promise<(string | null)[]> => {
    const source = `<template>${template}</template>${script ? `<script>${script}</script>` : ''}`;
    const [result] = await eslint.lintText(source, { filePath: 'src/snippet.vue' });
    return result?.messages.map((message) => message.ruleId) ?? [];
};

describe('design lint, Tailwind class rules', () => {
    it('passes classes the theme and the scale define', async () => {
        expect(
            await ruleIdsOf('<div class="size-12 max-w-7xl bg-primary text-on-primary" />')
        ).toEqual([]);
    });

    it('asks for the canonical spelling of an equal class pair', async () => {
        expect(await ruleIdsOf('<div class="h-12 w-12" />')).toContain(
            'better-tailwindcss/enforce-canonical-classes'
        );
    });

    it('asks for the canonical spelling of an arbitrary value the scale already has', async () => {
        expect(await ruleIdsOf('<div class="max-w-[1280px]" />')).toEqual([
            'better-tailwindcss/enforce-canonical-classes'
        ]);
    });

    it('reports a duplicate and a conflict', async () => {
        expect(await ruleIdsOf('<div class="p-4 p-4" />')).toContain(
            'better-tailwindcss/no-duplicate-classes'
        );
        expect(await ruleIdsOf('<div class="p-4 p-2" />')).toContain(
            'better-tailwindcss/no-conflicting-classes'
        );
    });

    it('reads the strings of a hoisted *_CLASSES map', async () => {
        const ids = await ruleIdsOf('<div />', "const BAD_CLASSES = { a: 'h-12 w-12' };");
        expect(ids).toContain('better-tailwindcss/enforce-canonical-classes');
    });

    it('fails an unused template disable', async () => {
        const ids = await ruleIdsOf(
            '<div><!-- eslint-disable-next-line better-tailwindcss/no-duplicate-classes -- nothing here --><p class="p-4" /></div>'
        );
        expect(ids.length).toBeGreaterThan(0);
    });
});
