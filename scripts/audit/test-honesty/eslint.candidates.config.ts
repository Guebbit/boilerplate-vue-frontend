/**
 * @module
 * Report-only ESLint config for the `test-honesty` audit: lists every test whose assertions are
 * ALL weak. It is not part of the lint gate (the gate's own rules refuse a conditional, a missing
 * and a duplicate-titled `expect`), so it is only ever run by `npm run audit:test-candidates`.
 */
import type { Linter } from 'eslint';
import { parser } from 'typescript-eslint';

/**
 * Matchers that pass for almost any value, so a test holding only these checks very little. The
 * two snapshot matchers are here too: they pin a whole render and check no one behaviour.
 */
const WEAK_MATCHERS =
    'BeDefined|BeTruthy|BeInstanceOf|BeNull|BeUndefined|Throw|MatchSnapshot|MatchInlineSnapshot';

/** A matcher call (`toXxx`) from the weak list. */
const WEAK_CALL = `CallExpression[callee.property.name=/^to(${WEAK_MATCHERS})$/]`;

/**
 * A matcher call over an `.exists()` read. In Vue Test Utils `exists()` sits inside the `expect`,
 * so `expect(wrapper.exists()).toBe(true)` reads as a strong `toBe` while checking only that
 * something mounted.
 */
const EXISTS_CALL = `CallExpression[callee.property.name=/^to/]:has(CallExpression[callee.property.name='exists'])`;

/** A matcher call (`toXxx`) that is neither in the weak list nor over `.exists()`: a real assertion. */
const STRONG_CALL = `CallExpression[callee.property.name=/^to(?!(${WEAK_MATCHERS})$)/]:not(:has(CallExpression[callee.property.name='exists']))`;

/**
 * `it(...)` / `test(...)` holding at least one weak assertion and no other.
 * Known false positives, fine for a candidate list: an asserting helper and Cypress's `cy.*`
 * assertions do not count as strong.
 */
export const WEAK_ONLY_SELECTOR = `CallExpression[callee.name=/^(it|test)$/]:matches(:has(${WEAK_CALL}), :has(${EXISTS_CALL})):not(:has(${STRONG_CALL}))`;

/**
 * The config. ESLint: `no-restricted-syntax` reports any node matching an esquery selector.
 * https://eslint.org/docs/latest/rules/no-restricted-syntax
 */
const candidatesConfig: Linter.Config[] = [
    {
        files: ['**/*.ts'],
        languageOptions: { parser },
        rules: {
            'no-restricted-syntax': [
                'warn',
                { selector: WEAK_ONLY_SELECTOR, message: 'every assertion in this test is weak' }
            ]
        }
    }
];

export default candidatesConfig;
