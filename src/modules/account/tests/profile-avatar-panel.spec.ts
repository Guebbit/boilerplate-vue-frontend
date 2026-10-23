/**
 * @module
 * `ProfileAvatar.vue`'s remove button: offered only while the account has a picture. An account
 * with none carries no `imageUrl`, so there is nothing to clear and no button to press.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

import ProfileAvatar from '../components/ProfileAvatar.vue';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/** The store's write, shared so a case can count its calls. */
const updateProfile = vi.fn();

/** The record the panel reads; a test sets it before mounting. */
const profile = ref<{ imageUrl?: string } | undefined>();

/**
 * A stand-in store: the panel only reads `profile` and the two loading flags, and the real store
 * would need a transport to seed.
 */
vi.mock('../stores/profile.ts', () => ({
    useProfileStore: () => ({
        profile,
        uploadingAvatar: ref(false),
        removingAvatar: ref(false),
        updateProfile
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
});

/**
 * Mounts the panel with the profile store holding the given picture.
 *
 * @param imageUrl - The stored `imageUrl`, or nothing for an account without one.
 * @returns The mounted wrapper.
 */
const mountPanel = (imageUrl?: string) => {
    profile.value = { imageUrl };
    return mount(ProfileAvatar, { global: { plugins: [vuetify, i18n] } });
};

describe('ProfileAvatar — the remove button', () => {
    it('is offered while the account has a picture', () => {
        const wrapper = mountPanel('/images/ada.png');

        expect(wrapper.find('[data-test=profile-avatar-remove]').exists()).toBe(true);
    });

    it('is absent for an account with no picture', () => {
        const wrapper = mountPanel();

        expect(wrapper.find('[data-test=profile-avatar-remove]').exists()).toBe(false);
    });

    it('clears the picture once when the button is pressed twice before the first answer', async () => {
        updateProfile.mockResolvedValue(undefined);
        const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const button = mountPanel('/images/ada.png').get('[data-test=profile-avatar-remove]');

        void button.trigger('click');
        void button.trigger('click');
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(updateProfile).toHaveBeenCalledTimes(1);
    });
});
