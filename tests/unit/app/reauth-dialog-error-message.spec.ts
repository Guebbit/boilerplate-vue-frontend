/**
 * `ReauthDialog.vue` — the one branch worth pinning: a failed re-authentication used to show
 * "wrong password" no matter what actually failed. A network drop or a 5xx got the same wording
 * as a genuinely wrong password, which sends the visitor to retype a password that was never the
 * problem. Only a 401 is a wrong password; everything else shows the failure's own message.
 *
 * Kept apart from `reauth-dialog.spec.ts`'s general open/submit/resolve/cancel coverage: this file
 * needs a real (unstubbed) `VDialog`, since Vuetify teleports its content to `document.body`, and
 * an identity `t` so an assertion reads the dictionary KEY rather than a translation that would
 * change with the locale — neither mixes with that file's stubbed mount and real locale.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOMWrapper, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import ReauthDialog from '@/app/components/ReauthDialog.vue';
import { useReauthPromptStore } from '@/infrastructure/http/reauth-prompt.ts';
import vuetify from '@/ui/vuetify';

const reauthMock = vi.fn();

vi.mock('@/infrastructure/session.ts', () => ({
    useSessionStore: () => ({ reauth: reauthMock, reauthing: ref(false) })
}));

// Identity `t`, so an assertion reads the dictionary KEY rather than a translation that would
// change with the locale — the branch under test is WHICH key is chosen, not its wording.
vi.mock('vue-i18n', async (importOriginal) => ({
    ...(await importOriginal<typeof import('vue-i18n')>()),
    useI18n: () => ({ t: (key: string) => key })
}));

/**
 * Opens the dialog through the real prompt store, the way the step-up interceptor does.
 *
 * `attachTo: document.body` is required: `v-dialog` teleports its content to a
 * `.v-overlay-container` appended to `<body>`, outside the wrapper's own root, so it never shows
 * up in `wrapper.find()` regardless — every query below reads `document` directly instead.
 */
const openDialog = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useReauthPromptStore()
        .requestStepUp()
        .catch(() => {});
    mount(ReauthDialog, { attachTo: document.body, global: { plugins: [pinia, vuetify] } });
};

/**
 * The password `<input>`, once `v-dialog`'s own transition setup has mounted it.
 *
 * @throws {Error} Before the dialog has rendered its form.
 */
const passwordInput = (): HTMLInputElement => {
    const input = document.querySelector<HTMLInputElement>(
        '[data-test=reauth-dialog-password] input'
    );
    if (!input) throw new Error('the dialog has not rendered its form yet');
    return input;
};

/**
 * Types a password and submits the form.
 *
 * `v-dialog` mounts its content a tick after `mount()` returns, so this waits for the input to
 * actually exist first.
 */
const submitPassword = (password: string) =>
    vi
        .waitFor(passwordInput)
        .then((input) => new DOMWrapper(input).setValue(password))
        .then(() => new DOMWrapper(document.querySelector('form')).trigger('submit'));

beforeEach(() => {
    reauthMock.mockReset();
});

// Vuetify's overlay container is appended to <body> once per mount; clearing it keeps one test's
// dialog out of the next test's document queries.
afterEach(() => {
    document.body.innerHTML = '';
});

describe('ReauthDialog — a failed attempt', () => {
    it('shows the wrong-password message for a 401', () => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- simulating the API's own reject envelope, a plain object, exactly as `onResponseReject` produces it
        reauthMock.mockReturnValue(Promise.reject({ status: 401 }));
        openDialog();

        return submitPassword('nope').then(() =>
            vi.waitFor(() => {
                expect(document.body.textContent).toContain('reauth-dialog.error-wrong-password');
            })
        );
    });

    it('shows the failure’s own message for anything other than a 401', () => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- simulating the API's own reject envelope, a plain object, exactly as `onResponseReject` produces it
        reauthMock.mockReturnValue(Promise.reject({ status: 500, message: 'Server exploded' }));
        openDialog();

        return submitPassword('whatever').then(() =>
            vi.waitFor(() => {
                expect(document.body.textContent).toContain('Server exploded');
                expect(document.body.textContent).not.toContain(
                    'reauth-dialog.error-wrong-password'
                );
            })
        );
    });

    it('clears the password field either way, so a retry starts from empty', () => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- simulating the API's own reject envelope, a plain object, exactly as `onResponseReject` produces it
        reauthMock.mockReturnValue(Promise.reject({ status: 401 }));
        openDialog();

        return submitPassword('nope')
            .then(() =>
                vi.waitFor(() => {
                    expect(document.body.textContent).toContain('error-wrong-password');
                })
            )
            .then(() => {
                expect(passwordInput().value).toBe('');
            });
    });
});
