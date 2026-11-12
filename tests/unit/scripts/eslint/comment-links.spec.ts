/**
 * `scripts/eslint/comment-links` reports a comment that names a `.ts`/`.tsx` file git does not
 * track, and leaves a `<placeholder>` path, a URL and a real tracked file alone.
 */
import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import { commentLinks } from '../../../../scripts/eslint/comment-links';

// RuleTester finds its test runner on these statics; vitest has no globals.
RuleTester.describe = describe;
RuleTester.it = it;

/** Plain script sources: the rule reads comments from the token stream, not the AST. */
const tester = new RuleTester({
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' }
});

tester.run('comment-links', commentLinks as never, {
    valid: [
        { code: '// See scripts/eslint/comment-links.ts.\nconst a = 1;' },
        { code: '// The twin: <paired-backend>/src/app/demo.ts.\nconst a = 1;' },
        { code: '// https://example.com/some/where/gone.ts is not ours to check.\nconst a = 1;' }
    ],
    invalid: [
        {
            code: '// Built by src/infrastructure/adapters/no-such-file.ts.\nconst a = 1;',
            errors: [{ messageId: 'stale' }]
        },
        {
            code: '/* Sibling: ./no-such-sibling.ts */\nconst a = 1;',
            filename: 'scripts/x.ts',
            errors: [{ messageId: 'stale' }]
        }
    ]
});
