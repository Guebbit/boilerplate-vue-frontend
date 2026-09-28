/**
 * `stale-deploy.ts` (FA74) — an open tab whose lazily-imported route chunk 404s after a newer
 * deploy replaced the asset manifest recovers with exactly one reload, to the target it was
 * actually headed for, and never a second time in the same session.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStaleDeployRecovery, recoverFromStaleDeploy } from '@/app/router/stale-deploy';
import type { PreloadErrorSource } from '@/app/router/stale-deploy';

/** A stub {@link PreloadErrorSource} capturing the one listener it is asked to add. */
const makeTarget = (): PreloadErrorSource & { fire: () => void } => {
    let listener: ((event: { preventDefault: () => void }) => void) | undefined;
    return {
        addEventListener: (_type, handler) => {
            listener = handler;
        },
        fire: () => listener?.({ preventDefault: vi.fn() })
    };
};

/** A stub `sessionStorage` — just the two members `recoverFromStaleDeploy` reads and writes. */
const makeStorage = () => {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value)
    };
};

describe('recoverFromStaleDeploy', () => {
    let storage: ReturnType<typeof makeStorage>;
    let navigate: ReturnType<typeof vi.fn<(url: string) => void>>;

    beforeEach(() => {
        storage = makeStorage();
        navigate = vi.fn<(url: string) => void>();
    });

    it('does nothing when the last failure was not a Vite preload error', () => {
        expect(recoverFromStaleDeploy('/en/products', navigate, storage)).toBe(false);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('reloads to the failed navigation’s own target after a preload error', () => {
        const target = makeTarget();
        registerStaleDeployRecovery(target);
        target.fire();

        expect(recoverFromStaleDeploy('/en/products', navigate, storage)).toBe(true);
        expect(navigate).toHaveBeenCalledWith('/en/products');
    });

    it('marks the reload done, so a second failure in the same tab does not loop', () => {
        const target = makeTarget();
        registerStaleDeployRecovery(target);

        target.fire();
        recoverFromStaleDeploy('/en/products', navigate, storage);
        navigate.mockClear();

        // A genuinely broken deploy fails again after the reload — still only one retry.
        target.fire();
        expect(recoverFromStaleDeploy('/en/products', navigate, storage)).toBe(false);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('consumes the preload-error flag even when the retry was already spent', () => {
        // Guards against the flag itself leaking into a LATER, unrelated failure once the
        // session has already retried once.
        const target = makeTarget();
        registerStaleDeployRecovery(target);
        storage.setItem('app:stale-deploy-reloaded', '1');

        target.fire();
        recoverFromStaleDeploy('/en/products', navigate, storage);

        expect(recoverFromStaleDeploy('/en/other', navigate, storage)).toBe(false);
        expect(navigate).not.toHaveBeenCalled();
    });
});
