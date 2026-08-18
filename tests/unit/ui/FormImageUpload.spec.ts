/**
 * `FormImageUpload.vue` — the component the plan ranks first by risk.
 *
 * `utils/uploads.ts` (the limits and the predicates) is well tested and now carries property
 * tests too. The component WRAPPING it was not tested at all, and the thing it owns is not
 * validation — it is a **resource**.
 *
 * `URL.createObjectURL` pins the picked blob in memory until `revokeObjectURL` releases it. The
 * component holds the URL in a ref precisely so it can revoke it, and there are three moments
 * where failing to do so leaks a whole image:
 *
 *   1. replacing one pick with another,
 *   2. clearing the field,
 *   3. unmounting while a file is picked.
 *
 * None of the three shows up as a failing assertion anywhere else, and none is visible in the UI
 * — it is a long editing session quietly holding a dozen images. So all three are asserted here
 * against a counted stub, which is the only way to see a revoke that did not happen.
 *
 * The other behaviours worth pinning are the two that a naive implementation gets backwards:
 * `progress === 0` must SHOW the bar (a request that has started and sent nothing) while
 * `undefined` hides it; and an array selection must be collapsed back into the model, because
 * every `imageUpload` field in the contract declares a single file.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import vuetify from '@/ui/vuetify';
import { i18n } from '@/infrastructure/i18n';
import { ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE } from '@/infrastructure/utils/uploads';

/** Object-URL bookkeeping, so a missing revoke is observable. */
const created: string[] = [];
const revoked: string[] = [];

beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    let counter = 0;
    globalThis.URL.createObjectURL = vi.fn(() => {
        counter += 1;
        const url = `blob:mock/${counter}`;
        created.push(url);
        return url;
    });
    globalThis.URL.revokeObjectURL = vi.fn((url: string) => {
        revoked.push(url);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

const makeFile = (name = 'photo.png', type = 'image/png') =>
    new File([new Uint8Array([1, 2, 3])], name, { type });

const mountUpload = (props: Record<string, unknown> = {}) =>
    mount(FormImageUpload, {
        props,
        global: { plugins: [vuetify, i18n] }
    });

describe('FormImageUpload — the object-URL resource', () => {
    it('mints exactly one object URL for a picked file', async () => {
        const wrapper = mountUpload();

        await wrapper.setProps({ modelValue: makeFile() });
        await wrapper.vm.$nextTick();

        expect(created).toHaveLength(1);
    });

    it('revokes the previous URL when the pick is REPLACED', async () => {
        // The leak that is easiest to miss: clearing is usually handled, replacing is not.
        const wrapper = mountUpload();

        await wrapper.setProps({ modelValue: makeFile('first.png') });
        await wrapper.vm.$nextTick();
        await wrapper.setProps({ modelValue: makeFile('second.png') });
        await wrapper.vm.$nextTick();

        expect(created).toHaveLength(2);
        expect(revoked).toContain(created[0]);
    });

    it('revokes the URL when the field is cleared', async () => {
        const wrapper = mountUpload();

        await wrapper.setProps({ modelValue: makeFile() });
        await wrapper.vm.$nextTick();
        await wrapper.setProps({ modelValue: undefined });
        await wrapper.vm.$nextTick();

        expect(revoked).toContain(created[0]);
    });

    it('revokes the URL on unmount, rather than leaking it with the component', async () => {
        const wrapper = mountUpload();

        await wrapper.setProps({ modelValue: makeFile() });
        await wrapper.vm.$nextTick();
        wrapper.unmount();

        expect(revoked).toContain(created[0]);
    });

    it('revokes nothing when nothing was ever picked', () => {
        // `releaseObjectUrl` guards on the ref; without the guard this revokes `undefined`.
        mountUpload().unmount();

        expect(revoked).toHaveLength(0);
    });
});

describe('FormImageUpload — the preview', () => {
    it('shows the existing image while nothing is picked', () => {
        const wrapper = mountUpload({ currentImageUrl: '/images/existing.png' });

        expect(wrapper.find('img').attributes('src')).toBe('/images/existing.png');
    });

    it('prefers the picked file over the existing image', async () => {
        // An edit form must not keep showing the old picture after the user chose a new one.
        const wrapper = mountUpload({ currentImageUrl: '/images/existing.png' });

        await wrapper.setProps({ modelValue: makeFile() });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('img').attributes('src')).toBe(created[0]);
    });

    it('renders no image at all when there is neither', () => {
        expect(mountUpload().find('img').exists()).toBe(false);
    });

    it('falls back to the existing image again once the pick is cleared', async () => {
        const wrapper = mountUpload({ currentImageUrl: '/images/existing.png' });

        await wrapper.setProps({ modelValue: makeFile() });
        await wrapper.vm.$nextTick();
        await wrapper.setProps({ modelValue: undefined });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('img').attributes('src')).toBe('/images/existing.png');
    });
});

/*
 * Selected by `data-testid`, never by `.v-progress-linear`: Vuetify's `v-file-input` renders its
 * own progress bar inside the field loader, so the class matches even when this component's bar
 * is absent — a spec written against it passes in both states and asserts nothing.
 */
describe('FormImageUpload — the progress bar', () => {
    it('is hidden while no upload is running', () => {
        expect(mountUpload().find('[data-testid=upload-progress]').exists()).toBe(false);
    });

    it('is SHOWN at zero percent, which is not the same as idle', async () => {
        // The distinction the component exists to make: `undefined` is idle, `0` is a request
        // that has started and sent nothing yet. A truthiness check collapses the two.
        const wrapper = mountUpload({ progress: 0 });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid=upload-progress]').exists()).toBe(true);
    });

    it('is shown while an upload is in flight', async () => {
        const wrapper = mountUpload({ progress: 42 });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid=upload-progress]').exists()).toBe(true);
    });

    it('rounds a fractional percentage', async () => {
        // Asserted on `aria-valuenow` rather than on the visible label, for two reasons: it is
        // what a screen reader actually announces, and the label is an i18n message whose
        // dictionary is lazily loaded, so in a unit test it renders as the raw key.
        const wrapper = mountUpload({ progress: 42.6 });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid=upload-progress]').attributes('aria-valuenow')).toBe(
            '43'
        );
    });

    it('reports the exact percentage when it is already whole', async () => {
        const wrapper = mountUpload({ progress: 42 });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid=upload-progress]').attributes('aria-valuenow')).toBe(
            '42'
        );
    });
});

describe('FormImageUpload — the field', () => {
    it('restricts the picker to the types the backend accepts', () => {
        // The picker's filter and the validation rule are both derived from ACCEPTED_IMAGE_TYPES
        // so they cannot disagree; this pins that the derivation actually reaches the DOM.
        expect(mountUpload().find('input[type=file]').attributes('accept')).toBe(
            ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE
        );
    });

    it('surfaces validation errors passed by the form', async () => {
        const wrapper = mountUpload({ errorMessages: ['File is too large'] });
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toContain('File is too large');
    });

    it('disables the picker while the form is submitting', () => {
        expect(
            mountUpload({ disabled: true }).find('input[type=file]').attributes('disabled')
        ).toBeDefined();
    });

    it('collapses an array selection back to a single file', async () => {
        // Vuetify types VFileInput's model as `File | File[] | null` because one component covers
        // the `multiple` case. Every `imageUpload` field in the contract is a single file, so an
        // array reaching the parent would be a contract violation.
        const wrapper = mountUpload();
        const file = makeFile();

        await wrapper.setProps({ modelValue: [file] as unknown as File });
        await wrapper.vm.$nextTick();

        const emitted = wrapper.emitted('update:modelValue');
        expect(emitted?.at(-1)?.[0]).toBe(file);
    });
});
