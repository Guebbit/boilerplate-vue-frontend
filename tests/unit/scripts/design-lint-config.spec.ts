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
            'better-tailwindcss/enforce-canonical-classes',
            'better-tailwindcss/no-restricted-classes'
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

    it("reports a class nothing defines, and passes the app's own and Vuetify's elevation", async () => {
        expect(await ruleIdsOf('<div class="text-red-500" />')).toContain(
            'better-tailwindcss/no-unknown-classes'
        );
        expect(await ruleIdsOf('<div class="skip-link elevation-4" />')).toEqual([]);
    });

    it('does not know a Vuetify utility Tailwind spells differently', async () => {
        expect(await ruleIdsOf('<div class="position-fixed" />')).toContain(
            'better-tailwindcss/no-unknown-classes'
        );
    });

    it("wipes Tailwind's shadow scale, so elevation is the way to a shadow", async () => {
        expect(await ruleIdsOf('<div class="shadow-lg" />')).toContain(
            'better-tailwindcss/no-unknown-classes'
        );
        expect(await ruleIdsOf('<div class="elevation-4" />')).toEqual([]);
    });

    it("gives a radius name Vuetify's value and refuses the v3 bare `rounded`", async () => {
        for (const radius of ['rounded-md', 'rounded-xl', 'rounded-2xl'])
            expect(await ruleIdsOf(`<div class="${radius}" />`)).toEqual([]);
        expect(await ruleIdsOf('<div class="rounded-3xl" />')).toContain(
            'better-tailwindcss/no-unknown-classes'
        );
        expect(await ruleIdsOf('<div class="rounded" />')).not.toEqual([]);
    });

    it('reads the classes a component prop carries', async () => {
        expect(await ruleIdsOf('<LazyImage rounded-class="rounded-3xl" />')).toContain(
            'better-tailwindcss/no-unknown-classes'
        );
        expect(await ruleIdsOf('<LazyImage rounded-class="rounded-full" />')).toEqual([]);
    });

    it('refuses what must not be improvised, each with its own way out', async () => {
        const refused = [
            'w-[13px]',
            'min-h-[60vh]',
            'bg-white',
            'text-black/50',
            'z-999',
            'hover:underline',
            'w-100',
            'h-screen',
            'order-first',
            'text-wrap',
            'md:align-baseline'
        ];
        const unrefused: string[] = [];
        for (const name of refused) {
            const ids = await ruleIdsOf(`<div class="${name}" />`);
            if (!ids.includes('better-tailwindcss/no-restricted-classes')) unrefused.push(name);
        }
        expect(unrefused).toEqual([]);
    });

    it('lets a token, a scale step and a refinement through', async () => {
        const refusedWrongly: string[] = [];
        for (const name of [
            'z-toast',
            'w-toast',
            'grid-cols-tiles',
            'w-1/2',
            'underline hover:text-primary'
        ]) {
            const ids = await ruleIdsOf(`<div class="${name}" />`);
            if (ids.length > 0) refusedWrongly.push(name);
        }
        expect(refusedWrongly).toEqual([]);
    });

    it('takes a reasoned disable for a one-off arbitrary value', async () => {
        expect(
            await ruleIdsOf(
                '<div><!-- eslint-disable-next-line better-tailwindcss/no-restricted-classes -- off-screen honeypot -->\n<p class="left-[-9999px]" /></div>'
            )
        ).toEqual([]);
    });
});
