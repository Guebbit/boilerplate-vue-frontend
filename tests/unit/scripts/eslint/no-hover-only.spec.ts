/**
 * `scripts/eslint/no-hover-only` reports an interaction a phone or a keyboard cannot reach:
 * a hover with no tap, a menu that opens only on hover, a gesture with no control, and a native
 * tooltip on text that is clipped.
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';
import { noHoverOnly } from '../../../../scripts/eslint/no-hover-only';

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

tester.run('no-hover-only', noHoverOnly as never, {
    valid: [
        { code: '<template><div @mouseenter="a" @click="b" /></template>', filename: 'a.vue' },
        { code: '<template><div @click="b" /></template>', filename: 'a.vue' },
        { code: '<template><v-menu open-on-hover open-on-click /></template>', filename: 'a.vue' },
        { code: '<template><v-menu /></template>', filename: 'a.vue' },
        { code: '<template><div draggable="false" /></template>', filename: 'a.vue' },
        { code: '<template><div :draggable="false" /></template>', filename: 'a.vue' },
        // A title on text that is shown in full is a refinement, not the only way to read it.
        { code: '<template><span title="x" class="text-sm" /></template>', filename: 'a.vue' }
    ],
    invalid: [
        {
            code: '<template><div @mouseenter="a" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'hoverHandler' }]
        },
        {
            code: '<template><div @pointerover="a" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'hoverHandler' }]
        },
        {
            code: '<template><v-menu open-on-hover /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'openOnHover' }]
        },
        {
            code: '<template><div @contextmenu.prevent="a" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'gestureOnly' }]
        },
        {
            code: '<template><div draggable="true" @drop="a" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'gestureOnly' }, { messageId: 'gestureOnly' }]
        },
        {
            code: '<template><div v-touch="a" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'gestureOnly' }]
        },
        {
            code: '<template><span :title="e" class="line-clamp-1 text-xs" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'hoverTitle' }]
        },
        {
            code: '<template><span title="e" class="truncate" /></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'hoverTitle' }]
        }
    ]
});
