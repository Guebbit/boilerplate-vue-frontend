/**
 * @module
 * How hard the GENERATIVE unit specs push: fork of BE `tests/support/knobs.ts`, not kept in step.
 *
 * A depth knob trades rigour for time. Turning it down changes what a spec ASKS, never what the
 * code under test answers; nothing under `src/` reads it.
 *
 * Read off `process.env`, which `vitest.config.ts` has already filled from `.env` for an allowlist
 * of exactly these names (a worker only sees `process.env`). The shell wins over `.env`.
 */

/**
 * One count knob, floored so a value cannot make the spec that reads it vacuous.
 * Nonsense reads as unset, so a typo gives the default and not a run of zero cases.
 *
 * @param name - the environment variable to read
 * @param fallback - the committed default, used when the knob is unset or unparseable
 * @param minimum - the lowest value that still asks the question the spec exists to ask
 * @returns the resolved count, never below `minimum`
 */
export const countKnob = (name: string, fallback: number, minimum: number): number => {
    const parsed = Number(process.env[name]?.trim());
    return Number.isInteger(parsed) && parsed > 0 ? Math.max(minimum, parsed) : fallback;
};

/**
 * Cases per fast-check property - `TEST_PROPERTY_RUNS`.
 * The unit gate runs on the pre-commit path, so the default stays modest; raise it to hunt.
 */
export const PROPERTY_RUNS = countKnob('TEST_PROPERTY_RUNS', 200, 10);
