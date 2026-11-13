/**
 * Script command line: the switches and values a script reads from `process.argv`.
 *
 * Lenient on purpose, so a flag the script does not know (one npm adds, or a sibling script's)
 * never throws.
 */
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flagValue, hasFlag, requiredPath } from '../../../scripts/cli';

const originalArguments = process.argv;

/** Runs the script as if it was started with these arguments after `node script`. */
const startedWith = (...rest: string[]): void => {
    process.argv = ['node', 'script.ts', ...rest];
};

afterEach(() => {
    process.argv = originalArguments;
});

describe('hasFlag', () => {
    it('is true when the switch is given', () => {
        startedWith('--check');
        expect(hasFlag('check')).toBe(true);
    });

    it('is false when the switch is absent', () => {
        startedWith('--other');
        expect(hasFlag('check')).toBe(false);
    });

    it('finds a switch among positionals and unknown flags', () => {
        startedWith('report.json', '--unknown=1', '--dry-run');
        expect(hasFlag('dry-run')).toBe(true);
    });

    it('does not mistake a valued flag of another name for the switch', () => {
        startedWith('--only=shard-03');
        expect(hasFlag('force')).toBe(false);
    });
});

describe('flagValue', () => {
    it('reads both `--flag value` and `--flag=value`', () => {
        startedWith('--limit', '2');
        expect(flagValue('limit')).toBe('2');
        startedWith('--limit=3');
        expect(flagValue('limit')).toBe('3');
    });

    it('is undefined when the flag is absent', () => {
        startedWith('--other=1');
        expect(flagValue('limit')).toBeUndefined();
    });
});

describe('requiredPath', () => {
    it('resolves a relative value against the root', () => {
        startedWith('--out', 'contracts/x.ts');
        expect(requiredPath('out', '/repo')).toBe(path.resolve('/repo', 'contracts/x.ts'));
    });

    it('reads the `--flag=value` spelling too', () => {
        startedWith('--in=a.yaml');
        expect(requiredPath('in', '/repo')).toBe(path.resolve('/repo', 'a.yaml'));
    });

    it('exits 1 with a usage line when the flag is missing', () => {
        startedWith('--other', 'x');
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('exit');
        });

        expect(() => requiredPath('out', '/repo')).toThrow('exit');
        expect(exit).toHaveBeenCalledWith(1);
        expect(error).toHaveBeenCalledWith('Missing required argument: --out <path>');

        error.mockRestore();
        exit.mockRestore();
    });
});
