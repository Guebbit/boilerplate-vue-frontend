/**
 * `scripts/eslint/theme-token` reports a colour that is not a named theme colour. One suite per
 * parser: `.ts` files go through the TypeScript parser, `.vue` files through `vue-eslint-parser`,
 * which is also what exposes the template to the rule.
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';
import { themeToken } from '../../../../scripts/eslint/theme-token';

// RuleTester finds its test runner on these statics; vitest has no globals.
RuleTester.describe = describe;
RuleTester.it = it;

/** RuleTester over `.ts` sources. */
const scriptTester = new RuleTester({
    languageOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' }
});

/** RuleTester over `.vue` sources, so the template is parsed. */
const templateTester = new RuleTester({
    languageOptions: {
        parser: vueParser,
        parserOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' }
    }
});

scriptTester.run('theme-token (script)', themeToken as never, {
    valid: [
        { code: "const a = 'primary';" },
        { code: "const a = 'transparent';" },
        { code: "const a = 'rgb(var(--v-theme-primary))';" },
        { code: "const a = 'rgb(var(--v-theme-primary-darken-1))';" },
        { code: "const a = 'rgb(var(--v-theme-on-surface-variant) / 0.5)';" },
        { code: 'const a = `rgb(var(--v-theme-${name}))`;' },
        // A hash link is not a hex colour.
        { code: "const a = '#main-content';" },
        // Prose that merely contains a colour word is not a colour literal.
        { code: "const a = 'the red button';" }
    ],
    invalid: [
        { code: "const a = '#ff9800';", errors: [{ messageId: 'colorLiteral' }] },
        { code: "const a = '#fff';", errors: [{ messageId: 'colorLiteral' }] },
        { code: "const a = 'rgb(255 0 0)';", errors: [{ messageId: 'colorLiteral' }] },
        { code: "const a = 'hsl(10 20% 30%)';", errors: [{ messageId: 'colorLiteral' }] },
        { code: "const a = 'rebeccapurple';", errors: [{ messageId: 'colorLiteral' }] },
        { code: 'const a = `border: 1px solid #fff`;', errors: [{ messageId: 'colorLiteral' }] },
        {
            code: "const a = 'rgb(var(--v-theme-brand))';",
            errors: [{ messageId: 'unknownThemeVariable' }]
        }
    ]
});

templateTester.run('theme-token (template)', themeToken as never, {
    valid: [
        { code: '<template><v-btn color="primary" /></template>', filename: 'a.vue' },
        {
            code: "<template><v-chip :color=\"on ? 'success' : 'error'\" /></template>",
            filename: 'a.vue'
        },
        {
            code: '<template><v-chip :color="statusColor(row.status)" /></template>',
            filename: 'a.vue'
        },
        {
            // A call's argument is text, not the colour.
            code: '<template><v-chip :color="pick(\'anything\')" /></template>',
            filename: 'a.vue'
        },
        {
            // A colour prop on a component that is not Vuetify's means whatever it says.
            code: '<template><my-swatch color="brand" /></template>',
            filename: 'a.vue'
        },
        {
            code: '<template><v-icon color="primary-darken-1" /></template>',
            filename: 'a.vue'
        },
        {
            code: '<template><v-icon color="on-primary" /></template>',
            filename: 'a.vue'
        }
    ],
    invalid: [
        {
            code: '<template><v-btn color="grey" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'colorLiteral' }]
        },
        {
            code: '<template><v-btn color="brand" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'unknownThemeColor' }]
        },
        {
            code: "<template><v-chip :color=\"on ? 'success' : 'default'\" /></template>",
            filename: 'a.vue',
            errors: [{ messageId: 'unknownThemeColor' }]
        },
        {
            code: '<template><div style="color: #ff9800" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'colorLiteral' }]
        },
        {
            code: '<template><v-card bg-color="#fafafa" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'colorLiteral' }]
        },
        {
            code: '<template><div :style="{ color: \'rgb(var(--v-theme-brand))\' }" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'unknownThemeVariable' }]
        },
        {
            code: '<template><div /></template><script setup lang="ts">const a = \'#ff0000\';</script>',
            filename: 'a.vue',
            errors: [{ messageId: 'colorLiteral' }]
        }
    ]
});
