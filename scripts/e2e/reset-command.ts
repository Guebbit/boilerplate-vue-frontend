/**
 * Turns `LIVE_RESET_COMMAND` into the command `cy.restore(scenario)` actually runs.
 *
 * The command carries a `{scenario}` placeholder where the backend takes the scenario name as a
 * positional argument. `{backend}` and `{describeTo}` are already filled in by
 * `scripts/pairing/paired-backend-path.ts`; the scenario is a per-call value, so it is filled in
 * here, at restore time.
 */

/** The placeholder a reset command carries where the scenario name goes. */
export const SCENARIO_PLACEHOLDER = '{scenario}';

/**
 * A scenario name is spliced into a shell command (`cy.exec` runs one), so only the characters a
 * registry key can hold are allowed through.
 */
const SCENARIO_NAME = /^[\w-]+$/;

/**
 * Fills `{scenario}` in a live reset command.
 *
 * - No scenario named: the placeholder becomes empty, so the backend uses its own default.
 * - A scenario named but the command has no placeholder: throws. Running the reset anyway would
 *   silently reseed the default scenario, and the spec would assert against the wrong rows.
 *
 * @param command - the resolved `LIVE_RESET_COMMAND`
 * @param scenario - the scenario `cy.restore()` was asked for, if any
 * @returns the command to execute
 * @throws {Error} When a scenario is named and the command cannot take it, or the name is unsafe.
 */
export const withScenario = (command: string, scenario?: string): string => {
    if (scenario === undefined) return command.replaceAll(SCENARIO_PLACEHOLDER, '').trim();
    if (!SCENARIO_NAME.test(scenario))
        throw new Error(`restore: "${scenario}" is not a scenario name`);
    if (!command.includes(SCENARIO_PLACEHOLDER))
        throw new Error(
            `restore("${scenario}"): LIVE_RESET_COMMAND has no ${SCENARIO_PLACEHOLDER} placeholder, so the live reset cannot seed it. Add the placeholder where the backend takes the scenario name.`
        );
    return command.replaceAll(SCENARIO_PLACEHOLDER, scenario);
};
