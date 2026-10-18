/**
 * Project-local rules for the design system.
 *
 * Why they live here and not in a published plugin: they are about THIS repo's conventions and
 * have exactly one consumer. One file per rule, so each can be unit-tested with `RuleTester` — see
 * `tests/unit/scripts/eslint/`. The paired backend keeps the same layout in `scripts/eslint/`.
 */
import { templateDirectiveDescription } from './template-directive-description';
import { themeToken } from './theme-token';

/** The plugin's rule table: rule name (as used in `eslint.config.ts`) to implementation. */
export default {
    'template-directive-description': templateDirectiveDescription,
    'theme-token': themeToken
};
