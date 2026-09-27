/**
 * @module
 * Mounts the real `ProfileTwoFactor.vue`/`TwoFactorEnroll.vue` pair: FA14's "never park a secret
 * in a store" fix. The TOTP secret and the one-time backup codes must render from a component-
 * local ref fed by the setup/confirm call's own response — never from `useTwoFactorStore()`, which
 * `two-factor-store.spec.ts` already pins as holding neither field. Every assertion reads off
 * `document.body`: Vuetify's `v-dialog` teleports its content there, same as
 * `webhook-create-view.spec.ts`'s own secret-reveal modal.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProfileTwoFactor from '@/modules/account/components/ProfileTwoFactor.vue';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

// The re-enroll and regenerate confirmations go through the global dialog queue, which needs
// `DialogHost.vue` mounted to answer for real — this suite is about the secret's storage, not
// that plumbing, so the confirm is stubbed to always accept (same as `user-target-view.spec.ts`).
vi.mock('@/ui/dialog.ts', () => ({
    useDialogStore: () => ({ confirm: () => Promise.resolve(true) })
}));

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/**
 * A device method armed with an `enrolledAt`, the shape `GET /account/2fa`'s `methods` needs.
 */
const ARMED_TOTP = { method: 'totp', delivers: false, enrolledAt: '2026-01-01T00:00:00Z' };

/**
 * Mounts the panel with a fresh Pinia, attached to `document.body` so a `v-dialog`'s teleported
 * content is reachable, and the given `GET /account/2fa` answer.
 *
 * @param status - What `GET /account/2fa` answers on mount and on every refetch.
 */
const mountPanel = (status: Record<string, unknown>) => {
    setActivePinia(createPinia());
    responses = { 'GET /account/2fa': orvalEnvelope(status) };
    return mount(ProfileTwoFactor, { attachTo: document.body, global: { plugins: [vuetify, i18n] } });
};

beforeEach(() => {
    document.body.innerHTML = '';
    return loadLocale('en');
});

describe('ProfileTwoFactor + TwoFactorEnroll: the TOTP secret', () => {
    it('renders the freshly-issued secret straight from the setup response, not from the store', () => {
        const wrapper = mountPanel({
            enabled: false,
            methods: [],
            available: [{ method: 'totp', delivers: false, enrollable: true }],
            backupCodesRemaining: 0
        });

        return flushPromises()
            .then(() => {
                responses['POST /account/2fa/methods/totp/setup'] = orvalEnvelope({
                    method: 'totp',
                    delivers: false,
                    secret: 'JBSWY3DPEHPK3PXP',
                    otpauthUri: 'otpauth://totp/x'
                });
                return wrapper.get('[data-test=two-factor-add-totp]').trigger('click');
            })
            .then(flushPromises)
            .then(() => {
                expect(document.body.textContent).toContain('JBSWY3DPEHPK3PXP');
            });
    });

    it('confirming the FIRST factor reveals the backup codes from the confirm response, then discards them on Done', () => {
        mountPanel({
            enabled: false,
            methods: [],
            available: [{ method: 'totp', delivers: false, enrollable: true }],
            backupCodesRemaining: 0
        });

        return flushPromises()
            .then(() => {
                responses['POST /account/2fa/methods/totp/setup'] = orvalEnvelope({
                    method: 'totp',
                    delivers: false,
                    secret: 'JBSWY3DPEHPK3PXP',
                    otpauthUri: 'otpauth://totp/x'
                });
                return document.body
                    .querySelector<HTMLButtonElement>('[data-test=two-factor-add-totp]')
                    ?.click();
            })
            .then(flushPromises)
            .then(() => {
                responses['POST /account/2fa/methods/totp/confirm'] = orvalEnvelope({
                    method: 'totp',
                    backupCodes: ['aaa-111', 'bbb-222'],
                    backupCodesRemaining: 10
                });
                responses['GET /account/2fa'] = orvalEnvelope({
                    enabled: true,
                    methods: [ARMED_TOTP],
                    available: [],
                    backupCodesRemaining: 10
                });
                const codeInput = document.body.querySelector<HTMLInputElement>(
                    '[data-test=two-factor-enroll-code] input'
                );
                codeInput!.value = '123456';
                return codeInput?.dispatchEvent(new Event('input'));
            })
            .then(flushPromises)
            .then(() =>
                document.body
                    .querySelector<HTMLButtonElement>('[data-test=two-factor-enroll-confirm]')
                    ?.click()
            )
            .then(flushPromises)
            .then(() => {
                // The enroll dialog closed; the backup codes came along with it, not off the store.
                expect(document.body.querySelector('[data-test=two-factor-enroll]')).toBeNull();
                const codes = document.body.querySelector('[data-test=backup-codes-list]');
                expect(codes?.textContent).toContain('aaa-111');
                expect(codes?.textContent).toContain('bbb-222');

                document.body
                    .querySelector<HTMLInputElement>('[data-test=backup-codes-confirm-saved] input')
                    ?.click();
            })
            .then(flushPromises)
            .then(() =>
                document.body
                    .querySelector<HTMLButtonElement>('[data-test=backup-codes-continue]')
                    ?.click()
            )
            .then(flushPromises)
            .then(() => {
                expect(document.body.querySelector('[data-test=two-factor-backup-codes]')).toBeNull();
            });
    });
});

describe('ProfileTwoFactor: regenerating backup codes', () => {
    it('reveals the fresh codes from the regenerate response, sourced locally', () => {
        mountPanel({
            enabled: true,
            methods: [ARMED_TOTP],
            available: [],
            backupCodesRemaining: 3
        });

        return flushPromises()
            .then(() =>
                document.body
                    .querySelector<HTMLButtonElement>('[data-test=two-factor-regenerate-codes]')
                    ?.click()
            )
            .then(flushPromises)
            .then(() => {
                responses['POST /account/2fa/backup-codes'] = orvalEnvelope({
                    backupCodes: ['ccc-333', 'ddd-444'],
                    backupCodesRemaining: 10
                });
                responses['GET /account/2fa'] = orvalEnvelope({
                    enabled: true,
                    methods: [ARMED_TOTP],
                    available: [],
                    backupCodesRemaining: 10
                });
                const codeInput = document.body.querySelector<HTMLInputElement>(
                    '[data-test=two-factor-code-prompt-input] input'
                );
                codeInput!.value = '123456';
                return codeInput?.dispatchEvent(new Event('input'));
            })
            .then(flushPromises)
            .then(() =>
                document.body
                    .querySelector<HTMLButtonElement>('[data-test=two-factor-code-prompt-submit]')
                    ?.click()
            )
            .then(flushPromises)
            .then(() => {
                const codes = document.body.querySelector('[data-test=backup-codes-list]');
                expect(codes?.textContent).toContain('ccc-333');
            });
    });
});
