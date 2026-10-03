/**
 * `tests/support/e2e/reset-command.ts` — what `cy.restore(scenario)` runs on the live profile.
 *
 * The failure worth guarding is the silent one: a named scenario with a reset command that cannot
 * take it would reseed the default and let the spec assert against the wrong rows.
 */
import { describe, expect, it } from 'vitest';
import { withScenario } from '../../../../scripts/e2e/reset-command';

/** A reset command with a `{scenario}` placeholder. */
const COMMAND = 'npm run host -- scenario:apply:reset -- {scenario} --describe-to=/tmp/s.json';

describe('withScenario', () => {
    it('puts the named scenario where the placeholder is', () => {
        expect(withScenario(COMMAND, 'blank')).toBe(
            'npm run host -- scenario:apply:reset -- blank --describe-to=/tmp/s.json'
        );
    });

    it('leaves the scenario out when none is named, so the backend uses its default', () => {
        expect(withScenario(COMMAND)).toBe(
            'npm run host -- scenario:apply:reset --  --describe-to=/tmp/s.json'
        );
    });

    it('refuses a named scenario when the command has no placeholder', () => {
        expect(() => withScenario('npm run host -- scenario:apply:reset', 'blank')).toThrow(
            /no {scenario} placeholder/
        );
    });

    it('still accepts an unnamed restore for a command with no placeholder', () => {
        expect(withScenario('reset --describe-to=x')).toBe('reset --describe-to=x');
    });

    it('refuses a name that could break out of the shell command', () => {
        expect(() => withScenario(COMMAND, 'shop; rm -rf /')).toThrow(/not a scenario name/);
    });
});
