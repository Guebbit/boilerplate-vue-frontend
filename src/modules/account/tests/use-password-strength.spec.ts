/**
 * `use-password-strength.ts` — the zxcvbn score, loaded via dynamic import on first use so a
 * page with no password field never pays for the dictionaries.
 */
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { usePasswordStrength } from '@/modules/account/composables/use-password-strength.ts';

/** Stub for zxcvbn's `check`, returning a canned result per test. */
const check = vi.fn();

vi.mock('@zxcvbn-ts/core', () => ({
    // A named function, not an arrow: the real export is constructed with `new`, and a mock
    // arrow-function implementation cannot stand in for one.
    ZxcvbnFactory: vi.fn().mockImplementation(function zxcvbnFactoryMock() {
        return { check };
    })
}));
vi.mock('@zxcvbn-ts/language-common', () => ({
    dictionary: {},
    adjacencyGraphs: {}
}));
vi.mock('@zxcvbn-ts/language-en', () => ({
    dictionary: {},
    translations: {}
}));

describe('usePasswordStrength', () => {
    it('scores a non-empty password via zxcvbn', async () => {
        check.mockReturnValue({ score: 3 });
        const password = ref('');
        const { score } = usePasswordStrength(password);

        password.value = 'correct-horse';

        await vi.waitFor(() => expect(score.value).toBe(3));
        expect(check).toHaveBeenCalledWith('correct-horse');
    });

    it('clears the score for an empty password, without asking zxcvbn', async () => {
        check.mockReturnValue({ score: 3 });
        const password = ref('something');
        const { score } = usePasswordStrength(password);
        await vi.waitFor(() => expect(score.value).toBe(3));
        check.mockClear();

        password.value = '';

        await vi.waitFor(() => expect(score.value).toBeUndefined());
        expect(check).not.toHaveBeenCalled();
    });

    it('rescoring a changed password asks zxcvbn again with the new value', async () => {
        check.mockReturnValue({ score: 1 });
        const password = ref('first-candidate');
        const { score } = usePasswordStrength(password);
        await vi.waitFor(() => expect(score.value).toBe(1));

        check.mockReturnValue({ score: 4 });
        password.value = 'second-candidate';

        await vi.waitFor(() => expect(score.value).toBe(4));
        expect(check).toHaveBeenLastCalledWith('second-candidate');
    });
});
