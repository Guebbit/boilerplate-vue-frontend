/**
 * the sessions panel never rendered `lastUsedAt`, even though the API sends it — a visitor
 * deciding which device to revoke had only "expires", never "last seen".
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import ProfileSessions from '@/modules/account/components/ProfileSessions.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Session } from '@types';

wireModulesIntoCore();

const SESSION: Session = {
    id: 's1',
    current: false,
    expiration: '2026-12-01T00:00:00.000Z',
    lastUsedAt: '2026-09-20T10:00:00.000Z'
};

vi.mock('@/modules/account/stores/sessions.ts', () => ({
    useAccountSessionsStore: () => ({
        sessions: [SESSION],
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

vi.mock('@/modules/account/stores/auth.ts', () => ({
    useAuthStore: () => ({ logoutEverywhere: vi.fn() })
}));

const router = createRouter({ history: createMemoryHistory(), routes: [] });

describe('the sessions list', () => {
    it("renders each session's last-used time", async () => {
        await loadLocale('en');
        const wrapper = mount(ProfileSessions, {
            global: { plugins: [createPinia(), router, vuetify, i18n] }
        });

        expect(wrapper.find('.session-last-used').text()).toContain('Last used');
    });
});
