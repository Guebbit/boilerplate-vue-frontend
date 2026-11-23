/**
 * @module
 * The return page over a list-seeded row: a list item has no `lines`, so the detail-only parts
 * (the lines block and the staff moves) wait for the full record the arrival read brings.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { orvalMutator } from '@/infrastructure/http';
import ReturnTarget from '../views/ReturnTarget.vue';
import { useReturnsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn, aReturnListItem } from './return-fixtures.ts';
import { parseOrvalFixture } from '../../../../tests/support/unit/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * Settles the held `GET /returns/r1` with the full record.
 */
let answerDetail: (body: unknown) => void;

/**
 * The list item `GET /returns` answers.
 */
const listedRow = aReturnListItem({
    actions: {
        approve: true,
        decline: true,
        receive: false,
        recordProof: false,
        close: false,
        cancel: false
    }
});

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        config.url === '/returns'
            ? Promise.resolve(
                  parseOrvalFixture(config.method, config.url, {
                      items: [listedRow],
                      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
                  })
              )
            : new Promise((resolve) => {
                  answerDetail = (body) => {
                      resolve(parseOrvalFixture(config.method, config.url, body));
                  };
              })
    )
}));

vi.mock('vue-router', () => ({
    useRoute: () => ({ query: {} }),
    useRouter: () => ({
        hasRoute: () => false,
        push: vi.fn(),
        replace: vi.fn(),
        currentRoute: { value: { params: {} } }
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en');
});

describe('ReturnTarget over a list-seeded row', () => {
    it('shows the summary only until the whole record lands, then the lines and staff moves', async () => {
        // seed the cache the way the list does: a partial search stores list items
        await useReturnsStore().watchSearchReturns({ partial: true }).search();
        const wrapper = mount(ReturnTarget, {
            props: { id: 'r1' },
            global: { plugins: [vuetify, i18n] }
        });
        await flushPromises();

        expect(orvalMutator).toHaveBeenCalledTimes(2);
        expect(wrapper.find('[data-test=return-status]').exists()).toBe(true);
        expect(wrapper.find('[data-test=return-line]').exists()).toBe(false);
        expect(wrapper.find('[data-test=return-approve]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('postage-undefined');

        answerDetail(
            aReturn({
                actions: {
                    approve: true,
                    decline: true,
                    receive: false,
                    recordProof: false,
                    close: false,
                    cancel: false
                }
            })
        );
        await flushPromises();

        expect(wrapper.findAll('[data-test=return-line]')).toHaveLength(1);
        expect(wrapper.find('[data-test=return-approve]').exists()).toBe(true);
    });
});
