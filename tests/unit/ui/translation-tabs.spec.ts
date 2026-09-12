/**
 * `TranslationTabs.vue` — the tab bar's accessibility shape.
 *
 * A `role="tab"` cannot host a focusable child (`nested-interactive`), and a `<button>` sibling
 * inside `role="tablist"` breaks it the other way (`aria-required-children`) — moving the remove
 * button outside `<v-tabs>` is what keeps both clean. This spec is the guard against a regression
 * back into either shape, sub-second and with no cluster, unlike the e2e sweep that first found it.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import axe from 'axe-core';
import vuetify from '@/ui/vuetify';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import TranslationTabs from '@/ui/organisms/TranslationTabs.vue';

const LOCALES = [
    { tag: 'en', nativeName: 'English', direction: 'ltr' as const },
    { tag: 'it', nativeName: 'Italiano', direction: 'ltr' as const }
];

beforeAll(() => loadLocale('en'));

/**
 * Mounts with two open tabs (`en` the fallback, `it` removable) attached to `document.body` —
 * axe's `nested-interactive`/`aria-required-children` rules only fire against a real layout tree,
 * not a detached fragment.
 */
const mountTabs = (activeTab = 'en') =>
    mount(TranslationTabs, {
        props: {
            locales: LOCALES,
            openTags: ['en', 'it'],
            fallbackTag: 'en',
            modelValue: activeTab
        },
        global: { plugins: [vuetify, i18n] },
        attachTo: document.body
    });

let wrapper: VueWrapper | undefined;

afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
});

/**
 * Runs axe scoped to the two rules this component's shape is chosen to satisfy.
 * https://github.com/dequelabs/axe-core/blob/master/doc/API.md#api-name-axerun
 */
const auditTablist = (root: Element) =>
    axe.run(root, {
        runOnly: { type: 'rule', values: ['nested-interactive', 'aria-required-children'] }
    });

describe('TranslationTabs — the tablist shape axe cares about', () => {
    it('nests no focusable control inside a tab, and puts no stray child inside the tablist', () => {
        wrapper = mountTabs();
        return auditTablist(wrapper.element).then((results) => {
            expect(results.violations).toEqual([]);
        });
    });

    it('keeps the remove button as a real, labelled sibling outside the tablist', () => {
        wrapper = mountTabs('it');
        const removeButton = wrapper.get('[data-test=translation-tab-remove]');

        expect(removeButton.element.closest('[role=tablist]')).toBeNull();
        expect(removeButton.attributes('aria-label')).toBe('Remove Italiano');
    });
});

describe('TranslationTabs — the remove control acts on the active tab', () => {
    it('hides while the fallback tab is active', () => {
        wrapper = mountTabs('en');
        expect(wrapper.find('[data-test=translation-tab-remove]').exists()).toBe(false);
    });

    it('emits remove for the active, non-fallback tab', async () => {
        wrapper = mountTabs('it');
        await wrapper.get('[data-test=translation-tab-remove]').trigger('click');

        expect(wrapper.emitted('remove')).toEqual([['it']]);
    });
});

describe('TranslationTabs — the tab/panel link a caller completes', () => {
    it('gives every tab an id and aria-controls a caller can pair with its panel', () => {
        wrapper = mountTabs();
        const tab = wrapper.get('[data-test=translation-tab-it]');

        expect(tab.attributes('id')).toBe('translation-tab-it');
        expect(tab.attributes('aria-controls')).toBe('translation-panel-it');
    });
});
