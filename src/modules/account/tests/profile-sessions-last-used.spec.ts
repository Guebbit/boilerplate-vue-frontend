/**
 * The sessions panel shows what a visitor needs to pick the device to revoke: when it signed in,
 * when it was last seen, and (in `cookie` mode) which browser and system it is.
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import ProfileSessions from '../components/ProfileSessions.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Session } from '@types';

wireModulesIntoCore();

/** A session that is not the current one. */
const SESSION: Session = {
    id: 's1',
    current: false,
    createdAt: '2026-09-01T08:00:00.000Z',
    expiration: '2026-12-01T00:00:00.000Z',
    lastUsedAt: '2026-09-20T10:00:00.000Z'
};

/** A `cookie`-mode session, which carries the coarse device label. */
const SESSION_WITH_DEVICE: Session = {
    ...SESSION,
    id: 's2',
    device: 'Firefox on Linux'
};

vi.mock('../stores/sessions.ts', () => ({
    useAccountSessionsStore: () => ({
        sessions: [SESSION, SESSION_WITH_DEVICE],
        fetchSessions: vi.fn(),
        revokeSession: vi.fn()
    })
}));

// The sessions store above is a plain object, not a real Pinia store — `storeToRefs` only knows
// how to unwrap the latter. An identity pass-through is enough for a read-only render assertion.
vi.mock('pinia', async (importOriginal) => ({
    ...(await importOriginal<typeof import('pinia')>()),
    storeToRefs: (store: unknown) => store
}));

vi.mock('../stores/auth.ts', () => ({
    useAuthStore: () => ({ logoutEverywhere: vi.fn() })
}));

/** Memory-history router with no routes: the list only needs an instance. */
const router = createRouter({ history: createMemoryHistory(), routes: [] });

describe('the sessions list', () => {
    it("renders each session's last-used time", async () => {
        await loadLocale('en');
        const wrapper = mount(ProfileSessions, {
            global: { plugins: [createPinia(), router, vuetify, i18n] }
        });

        expect(wrapper.find('.session-last-used').text()).toContain('Last used');
    });

    it('renders when each sign-in began', async () => {
        await loadLocale('en');
        const wrapper = mount(ProfileSessions, {
            global: { plugins: [createPinia(), router, vuetify, i18n] }
        });

        expect(wrapper.find('[data-test="session-started"]').text()).toContain('Signed in');
    });

    it('shows the device label when the session carries one, and nothing when it does not', async () => {
        await loadLocale('en');
        const wrapper = mount(ProfileSessions, {
            global: { plugins: [createPinia(), router, vuetify, i18n] }
        });

        const devices = wrapper.findAll('[data-test="session-device"]');
        expect(devices.map((device) => device.text())).toEqual(['Firefox on Linux']);
    });
});
