/**
 * `ListEmptyState.vue` — the shared "no rows" state. It owns the icon look and the optional
 * actions slot; the spec pins both, and that extra attributes reach the Vuetify root.
 */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { Inbox } from 'lucide-vue-next';
import ListEmptyState from '@/ui/molecules/ListEmptyState.vue';
import vuetify from '@/ui/vuetify';

/** Mounts the state; slots are optional. */
const mountState = (slots: Record<string, string> = {}) =>
    mount(ListEmptyState, {
        props: { title: 'Nothing here', icon: Inbox },
        attrs: { 'data-test': 'empty' },
        slots,
        global: { plugins: [vuetify] }
    });

describe('ListEmptyState', () => {
    it('shows the title and a decorative secondary icon', () => {
        const wrapper = mountState();

        expect(wrapper.text()).toContain('Nothing here');
        const icon = wrapper.get('svg');
        expect(icon.classes()).toContain('text-secondary');
        expect(icon.attributes('aria-hidden')).toBe('true');
    });

    it('renders the actions slot only when given', () => {
        expect(mountState().find('[data-test=go]').exists()).toBe(false);
        expect(
            mountState({ actions: '<button data-test="go">Go</button>' })
                .find('[data-test=go]')
                .exists()
        ).toBe(true);
    });

    it('lets other attributes reach the root', () => {
        expect(mountState().attributes('data-test')).toBe('empty');
    });
});
