/**
 * `LegalPlaceholder` — the unfinished-text marker on Terms and Privacy: a warning plus a
 * headings-only checklist, taken from the page's own dictionary branch.
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import LegalPlaceholder from '@/app/components/LegalPlaceholder.vue';
import vuetify from '@/ui/vuetify';

vi.mock('vue-i18n', async (importOriginal) => {
    const actual = await importOriginal<typeof import('vue-i18n')>();
    return {
        ...actual,
        useI18n: () => ({
            t: (key: string) => key,
            tm: (path: string) => [`${path}#one`, `${path}#two`],
            rt: (message: string) => message
        })
    };
});

/** Mounts the placeholder for one page with a real Vuetify. */
const mountPlaceholder = (page: 'terms' | 'privacy') =>
    mount(LegalPlaceholder, { props: { page }, global: { plugins: [vuetify] } });

describe('LegalPlaceholder', () => {
    it.each(['terms', 'privacy'] as const)(
        'says the %s text is missing and lists what it must cover',
        (page) => {
            const text = mountPlaceholder(page).text();

            expect(text).toContain(`static-pages.${page}.placeholder.notice`);
            expect(text).toContain(`static-pages.${page}.placeholder.checklist-title`);
            expect(text).toContain(`static-pages.${page}.placeholder.sections#one`);
            expect(text).toContain(`static-pages.${page}.placeholder.sections#two`);
        }
    );

    it('puts the warning in an alert, so it is announced as one', () => {
        const wrapper = mountPlaceholder('terms');

        expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    });
});
