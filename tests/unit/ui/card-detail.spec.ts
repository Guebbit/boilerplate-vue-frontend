/**
 * `CardDetail.vue` — the detail-page card shell. Only the heading is logic: it renders when a
 * `title` is given (with the optional subtitle and the actions slot beside it) and not at all
 * otherwise, so a card used as a bare shell stays bare.
 */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import vuetify from '@/ui/vuetify';

/** Mounts the card with the given props and slots. */
const mountCard = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) =>
    mount(CardDetail, {
        props,
        slots: { default: '<p data-test="body">body</p>', ...slots },
        global: { plugins: [vuetify] }
    });

describe('CardDetail heading', () => {
    it('renders no heading without a title', () => {
        const wrapper = mountCard();

        expect(wrapper.find('h3').exists()).toBe(false);
        expect(wrapper.find('[data-test=body]').exists()).toBe(true);
    });

    it('renders the title, and the subtitle only when given', () => {
        expect(mountCard({ title: 'Details' }).find('p.mt-1').exists()).toBe(false);

        const wrapper = mountCard({ title: 'Details', subtitle: 'Edit the user' });
        expect(wrapper.get('h3').text()).toBe('Details');
        expect(wrapper.get('p.mt-1').text()).toBe('Edit the user');
    });

    it('renders the title-actions slot beside the heading', () => {
        const wrapper = mountCard(
            { title: 'Details' },
            { 'title-actions': '<button data-test="act">go</button>' }
        );

        expect(wrapper.find('[data-test=act]').exists()).toBe(true);
    });
});
