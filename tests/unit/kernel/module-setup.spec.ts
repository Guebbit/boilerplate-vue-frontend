/**
 * `runModuleSetups` — what `main.ts` calls after mount: each enabled module's boot work runs once,
 * and a module that is not enabled is never called.
 */
import { describe, expect, it, vi } from 'vitest';
import { runModuleSetups } from '@/kernel/registry';
import type { AppModule } from '@/kernel/registry';

/**
 * A module with no routes whose only behaviour is its boot work.
 *
 * @param name - The module's name.
 * @param setup - Its boot work, when it has any.
 */
const moduleWith = (name: string, setup?: () => void): AppModule => ({
    name,
    routes: [],
    ...(setup ? { setup } : {})
});

describe('runModuleSetups', () => {
    it('runs the setup of every enabled module exactly once, and never a disabled one', () => {
        const enabledA = vi.fn();
        const enabledB = vi.fn();
        const disabled = vi.fn();
        const enabled = [moduleWith('a', enabledA), moduleWith('b', enabledB)];
        // Built but left out of the list: the shape of a module folder that was deleted.
        moduleWith('c', disabled);

        runModuleSetups(enabled);

        expect(enabledA).toHaveBeenCalledTimes(1);
        expect(enabledB).toHaveBeenCalledTimes(1);
        expect(disabled).not.toHaveBeenCalled();
    });

    it('skips a module that has no boot work', () => {
        expect(() => runModuleSetups([moduleWith('quiet')])).not.toThrow();
    });
});
