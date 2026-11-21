/**
 * @module
 * `ProfileAvatar.vue`'s remove button: offered only while the account has a picture. An account
 * with none carries no `imageUrl`, so there is nothing to clear and no button to press. And a
 * picture write answered 412 (the account moved since it was loaded): the panel warns in place and
 * offers its own "reload latest", which re-reads `/account`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';

import ProfileAvatar from '../components/ProfileAvatar.vue';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n } from '@/i18n';
import vuetify from '@/ui/vuetify';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aProblem } from '../../../../tests/support/unit/fixtures.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';

wireModulesIntoCore();

/** The store's write, shared so a case can count its calls. */
const updateProfile = vi.fn();

/** The store's profile read, shared so a case can count its calls. */
const fetchProfile = vi.fn();

/** The record the panel reads; a test sets it before mounting. */
const profile = ref<{ imageUrl?: string } | undefined>();

/**
 * A stand-in store: the panel only reads `profile` and the two loading flags, and the real store
 * would need a transport to seed.
 */
vi.mock('../stores/profile.ts', () => ({
    useAccountProfileStore: () => ({
        profile,
        uploadingAvatar: ref(false),
        removingAvatar: ref(false),
        updateProfile,
        fetchProfile
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

        await Promise.all([button.trigger('click'), button.trigger('click')]);
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(updateProfile).toHaveBeenCalledTimes(1);
    });
});

describe('ProfileAvatar — a picture write answered 412', () => {
    /** The reject envelope `onResponseReject` builds for the API's 412. */
    const PRECONDITION_FAILED = aProblem(412, [
        { code: 'PRECONDITION_FAILED', message: 'Precondition failed' }
    ]);

    /**
     * Mounts the panel and picks a file whose upload the API refuses with the 412.
     */
    const uploadRefused = () => {
        updateProfile.mockRejectedValue(PRECONDITION_FAILED);
        const wrapper = mountPanel('/images/ada.png');
        emitOn(
            wrapper.findComponent(FormImageUpload),
            'update:modelValue',
            new File(['pixels'], 'avatar.png', { type: 'image/png' })
        );
        return vi
            .waitFor(() => expect(updateProfile).toHaveBeenCalled())
            .then(() => flushPromises())
            .then(() => wrapper);
    };

    it('warns that the account changed, and offers to reload', () =>
        uploadRefused().then((wrapper) => {
            const alert = wrapper.get('[data-test=profile-avatar-error]');
            expect(alert.text()).toContain(i18n.global.t('generic.error-stale-record'));
            expect(alert.classes().join(' ')).toContain('warning');
            expect(wrapper.find('[data-test=profile-avatar-reload-latest]').exists()).toBe(true);
        }));

    it('warns the same way when the removal is refused', () => {
        updateProfile.mockRejectedValue(PRECONDITION_FAILED);
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mountPanel('/images/ada.png');

        return wrapper
            .get('[data-test=profile-avatar-remove]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                expect(wrapper.find('[data-test=profile-avatar-reload-latest]').exists()).toBe(
                    true
                );
            });
    });

    it('re-reads the account past the cache on "reload latest", and clears the warning', () => {
        fetchProfile.mockResolvedValue(undefined);

        return uploadRefused().then((wrapper) =>
            wrapper
                .get('[data-test=profile-avatar-reload-latest]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(fetchProfile).toHaveBeenCalledWith(true);
                    expect(wrapper.find('[data-test=profile-avatar-reload-latest]').exists()).toBe(
                        false
                    );
                })
        );
    });

    it('shows any other failure as a plain error, with no reload offer', () => {
        updateProfile.mockRejectedValue(aProblem(500, [{ code: 'INTERNAL', message: 'Boom' }]));
        const wrapper = mountPanel('/images/ada.png');
        emitOn(
            wrapper.findComponent(FormImageUpload),
            'update:modelValue',
            new File(['pixels'], 'avatar.png', { type: 'image/png' })
        );

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=profile-avatar-reload-latest]').exists()).toBe(false);
            expect(wrapper.get('[data-test=profile-avatar-error]').text()).not.toBe('');
        });
    });
});
