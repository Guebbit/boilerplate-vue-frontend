/**
 * `InlineErrorAlert.vue` has exactly one boundary worth a test on its own: whether `message` is
 * set. Everything else — the type it colours with, the text it shows, the `role="alert"` that is
 * the whole reason this exists instead of a bare `v-alert` at each call site — is a direct prop
 * pass-through, proven together rather than in isolation.
 */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import vuetify from '@/ui/vuetify';

const mountAlert = (props: Record<string, unknown> = {}) =>
    mount(InlineErrorAlert, {
        props,
        global: { plugins: [vuetify] }
    });

describe('InlineErrorAlert — the render boundary', () => {
    it('renders nothing while message is unset', () => {
        expect(mountAlert().find('[role=alert]').exists()).toBe(false);
    });

    it('renders once a message is given', () => {
        const wrapper = mountAlert({ message: 'Something went wrong.' });

        expect(wrapper.find('[role=alert]').exists()).toBe(true);
        expect(wrapper.text()).toContain('Something went wrong.');
    });
});

describe('InlineErrorAlert — the pass-through props', () => {
    it('defaults to the error tone', () => {
        const wrapper = mountAlert({ message: 'Save failed.' });

        expect(wrapper.find('.v-alert').classes()).toContain('text-error');
    });

    it('takes the warning tone for an expected absence', () => {
        const wrapper = mountAlert({
            message: 'No order matches this reference.',
            type: 'warning'
        });

        expect(wrapper.find('.v-alert').classes()).toContain('text-warning');
    });

    it('carries the given data-test onto the rendered alert', () => {
        const wrapper = mountAlert({ message: 'Save failed.', testId: 'save-error' });

        expect(wrapper.find('[data-test=save-error]').exists()).toBe(true);
    });
});
