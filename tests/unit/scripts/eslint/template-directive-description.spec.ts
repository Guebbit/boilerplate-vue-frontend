/**
 * `scripts/eslint/template-directive-description` reports a template `eslint-disable` that gives
 * no reason. The parser is `vue-eslint-parser`: the rule reads `templateBody.comments`, which
 * the default parser does not produce.
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import vueParser from 'vue-eslint-parser';
import { templateDirectiveDescription } from '../../../../scripts/eslint/template-directive-description';

// RuleTester finds its test runner on these statics; vitest has no globals.
RuleTester.describe = describe;
RuleTester.it = it;

/** RuleTester over `.vue` sources, so the template is parsed. */
const tester = new RuleTester({
    languageOptions: { parser: vueParser, ecmaVersion: 'latest', sourceType: 'module' }
});

tester.run('template-directive-description', templateDirectiveDescription as never, {
    valid: [
        {
            code: '<template><div><!-- eslint-disable-next-line vue/no-v-html -- sanitised upstream --><p v-html="x" /></div></template>',
            filename: 'a.vue'
        },
        {
            // An ordinary comment is not a directive.
            code: '<template><div><!-- a note about the markup --></div></template>',
            filename: 'a.vue'
        },
        {
            // No template at all: nothing to read.
            code: '<script setup lang="ts">const a = 1;</script>',
            filename: 'a.vue'
        }
    ],
    invalid: [
        {
            code: '<template><div><!-- eslint-disable-next-line vue/no-v-html --><p v-html="x" /></div></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'missingDescription' }]
        },
        {
            code: '<template><div><!-- eslint-disable --><p /></div></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'missingDescription' }]
        },
        {
            code: '<template><div><!-- eslint-disable-line vue/no-v-html --></div></template>',
            filename: 'a.vue',
            errors: [{ messageId: 'missingDescription' }]
        }
    ]
});
