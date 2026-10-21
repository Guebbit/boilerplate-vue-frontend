/**
 * `RecordAsideCard.vue` — the summary card beside a detail or edit page. It holds no record
 * logic, so the spec asserts structure only: an `<aside>` root, the title tile, one field per
 * row in order, a row's test hook, the icon slot, and the default slot after the rows.
 */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { Hash } from 'lucide-vue-next';
import RecordAsideCard from '@/ui/organisms/RecordAsideCard.vue';
import vuetify from '@/ui/vuetify';
import type { DetailFieldRow } from '@/ui/types.ts';

/** Three rows, the middle one with a test hook and an icon. */
const ROWS: DetailFieldRow[] = [
    { label: 'Created', value: '2026-01-01' },
    { label: 'Id', value: 'abc', icon: Hash, test: 'row-id' },
    { label: 'Updated', value: null }
];

/** Mounts the card with the given rows and slots. */
const mountCard = (fields?: DetailFieldRow[], slots: Record<string, string> = {}) =>
    mount(RecordAsideCard, {
        props: { title: 'Ada', description: 'Admin', accent: 'secondary', fields },
        slots,
        global: { plugins: [vuetify] }
    });

describe('RecordAsideCard', () => {
    it('is an aside carrying the title and the description', () => {
        const wrapper = mountCard();

        expect(wrapper.find('aside').exists()).toBe(true);
        expect(wrapper.text()).toContain('Ada');
        expect(wrapper.text()).toContain('Admin');
    });

    it('renders one field per row, in order, with the label text', () => {
        const wrapper = mountCard(ROWS);

        const articles = wrapper.findAll('article');
        expect(articles.map((article) => article.text())).toEqual([
            expect.stringContaining('Created'),
            expect.stringContaining('Id'),
            expect.stringContaining('Updated')
        ]);
    });

    it('puts a row’s test hook on its field', () => {
        const wrapper = mountCard(ROWS);

        expect(wrapper.get('[data-test=row-id]').text()).toContain('abc');
    });

    it('lets the icon slot replace the default tile icon', () => {
        const wrapper = mountCard(undefined, { icon: '<i data-test="custom-icon" />' });

        expect(wrapper.find('[data-test=custom-icon]').exists()).toBe(true);
    });

    it('renders default-slot content after the rows', () => {
        const wrapper = mountCard(ROWS, { default: '<p data-test="after">after</p>' });

        const html = wrapper.html();
        expect(html.indexOf('Updated')).toBeLessThan(html.indexOf('data-test="after"'));
    });

    it('renders only the card when there are no rows', () => {
        expect(mountCard([]).findAll('article')).toHaveLength(0);
    });
});
