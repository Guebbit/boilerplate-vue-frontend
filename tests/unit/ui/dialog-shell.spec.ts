/**
 * `DialogShell.vue` — the `v-dialog` every form dialog sits in. Pinned here: the heading id the
 * slot receives is the one the dialog is named by, undeclared attributes reach the `v-dialog`,
 * `fullscreen` comes from `useFullscreenDialog`, and closing hands focus back to the opener.
 * `v-dialog` is stubbed inline: what is under test is the wiring, not Vuetify's overlay.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import DialogShell from '@/ui/organisms/DialogShell.vue';

// A phone, so the binding is visibly `true` rather than the jsdom default width's `false`.
vi.mock('@/ui/composables/use-fullscreen-dialog.ts', () => ({
    useFullscreenDialog: () => ref(true)
}));

/**
 * Stand-in for Vuetify's `v-dialog`: renders its content inline and shows the two props the shell
 * sets, so they can be read off the DOM. Everything else falls through as attributes.
 */
const VDialogStub = {
    props: ['modelValue', 'fullscreen'],
    template:
        '<div data-stub="v-dialog" :data-open="String(modelValue)" :data-fullscreen="String(fullscreen)"><slot /></div>'
};

/**
 * Mounts the shell with a heading that carries the slot's `titleId`.
 *
 * @param modelValue - Whether the dialog starts open.
 * @returns The wrapper, attached to the document so focus can move.
 */
const mountShell = (modelValue: boolean) =>
    mount(DialogShell, {
        props: { modelValue },
        attrs: { 'max-width': '480', 'data-test': 'some-dialog', role: 'alertdialog' },
        slots: { default: '<h2 :id="params.titleId">Title</h2>' },
        global: { stubs: { VDialog: VDialogStub } },
        attachTo: document.body
    });

/** Lets the return-focus watcher and its `nextTick` hand-back both run. */
const settle = () => nextTick().then(() => nextTick());

describe('DialogShell', () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it('names the dialog by the heading that carries the slot id', () => {
        const wrapper = mountShell(true);
        const dialog = wrapper.get('[data-stub=v-dialog]');
        const headingId = wrapper.get('h2').attributes('id');

        expect(headingId).toBeTruthy();
        expect(dialog.attributes('aria-labelledby')).toBe(headingId);
        wrapper.unmount();
    });

    it('passes undeclared attributes through to the v-dialog', () => {
        const wrapper = mountShell(true);
        const dialog = wrapper.get('[data-stub=v-dialog]');

        expect(dialog.attributes('data-test')).toBe('some-dialog');
        expect(dialog.attributes('max-width')).toBe('480');
        expect(dialog.attributes('role')).toBe('alertdialog');
        wrapper.unmount();
    });

    it('binds fullscreen from useFullscreenDialog', () => {
        const wrapper = mountShell(true);

        expect(wrapper.get('[data-stub=v-dialog]').attributes('data-fullscreen')).toBe('true');
        wrapper.unmount();
    });

    it('hands focus back to the opener once closed', async () => {
        const opener = document.createElement('button');
        document.body.append(opener);
        opener.focus();
        const wrapper = mountShell(false);

        await wrapper.setProps({ modelValue: true });
        await settle();
        // Stand-in for Vuetify moving focus into the dialog.
        opener.blur();
        await wrapper.setProps({ modelValue: false });
        await settle();

        expect(document.activeElement).toBe(opener);
        wrapper.unmount();
    });
});
