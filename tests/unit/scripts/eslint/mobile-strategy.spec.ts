/**
 * `scripts/eslint/mobile-strategy` reports a dialog, a data table or a plain table without its
 * phone strategy. It reads the template, so every case goes through `vue-eslint-parser`.
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';
import { mobileStrategy } from '../../../../scripts/eslint/mobile-strategy';

// RuleTester finds its test runner on these statics; vitest has no globals.
RuleTester.describe = describe;
RuleTester.it = it;

/** RuleTester over `.vue` sources, so the template is parsed. */
const tester = new RuleTester({
    languageOptions: {
        parser: vueParser,
        parserOptions: { parser: tsParser, ecmaVersion: 'latest', sourceType: 'module' }
    }
});

tester.run('mobile-strategy', mobileStrategy as never, {
    valid: [
        { code: '<template><v-dialog :fullscreen="fullscreen" /></template>', filename: 'a.vue' },
        { code: '<template><v-dialog fullscreen /></template>', filename: 'a.vue' },
        {
            code: '<template><v-table v-focusable-scroll="t(\'x\')" /></template>',
            filename: 'a.vue'
        },
        // The wrapper is the one place a Vuetify data table may be rendered.
        {
            code: '<template><v-data-table-server /></template>',
            filename: '/repo/src/ui/organisms/DataTable.vue'
        },
        { code: '<template><v-card /></template>', filename: 'a.vue' }
    ],
    invalid: [
        {
            code: '<template><v-dialog max-width="420" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'dialogNotFullscreen' }]
        },
        {
            code: '<template><v-data-table /></template>',
            filename: '/repo/src/modules/x/views/List.vue',
            errors: [{ messageId: 'tableOutsideDataTable' }]
        },
        {
            code: '<template><v-table v-focusable-scroll /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'scrollWithoutName' }]
        },
        {
            code: '<template><v-table /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'scrollWithoutName' }]
        }
    ]
});
