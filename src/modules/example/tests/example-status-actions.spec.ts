/**
 * @module
 * The injecting half of the provide/inject pair: it renders exactly the events the server flagged
 * open in `actions` (it decides none of its own), and asks the provider, never the store, to
 * make one.
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import ExampleStatusActions from '../components/ExampleStatusActions.vue';
import { provideExample } from '../provided';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Example } from '@types';
import type { ExampleEvent } from '../store';

wireModulesIntoCore();

/**
 * Mounts the actions under a provider holding a draft example.
 *
 * @param open - The events the server flagged open, or `undefined` while the example loads.
 * @param changeStatus - What the provider does when asked.
 */
const mountUnder = (
    open: readonly ExampleEvent[] | undefined,
    changeStatus: (next: ExampleEvent) => Promise<unknown> = vi.fn().mockResolvedValue(undefined)
) => {
    const Provider = defineComponent({
        setup() {
            provideExample({
                example: ref(
                    open
                        ? ({
                              id: 'a',
                              status: 'draft',
                              actions: {
                                  publish: open.includes('publish'),
                                  archive: open.includes('archive'),
                                  unarchive: open.includes('unarchive'),
                                  update: true,
                                  delete: true
                              }
                          } as Example)
                        : undefined
                ),
                changeStatus
            });
        },
        render() {
            return h(ExampleStatusActions);
        }
    });
    return loadLocale('en').then(() => mount(Provider, { global: { plugins: [vuetify, i18n] } }));
};

/**
 * The event each rendered button applies.
 *
 * @param wrapper - The mounted provider.
 */
const offered = (wrapper: Awaited<ReturnType<typeof mountUnder>>) =>
    wrapper.findAll('[data-test^=example-move-]').map((button) => button.attributes('data-test'));

describe('ExampleStatusActions', () => {
    it.each([
        [
            ['publish', 'archive'],
            ['example-move-publish', 'example-move-archive']
        ],
        [['archive'], ['example-move-archive']],
        [['unarchive'], ['example-move-unarchive']],
        [[], []]
    ] as const)('renders the events the server flags open: %j', (open, expected) =>
        mountUnder([...open]).then((wrapper) => {
            expect(offered(wrapper)).toEqual(expected);
        })
    );

    it('offers nothing while the example is still loading', () =>
        mountUnder(undefined).then((wrapper) => {
            expect(offered(wrapper)).toEqual([]);
        }));

    it('asks the provider for the move a button names', () => {
        const changeStatus = vi.fn().mockResolvedValue(undefined);

        return mountUnder(['publish'], changeStatus).then((wrapper) =>
            wrapper
                .get('[data-test=example-move-publish]')
                .trigger('click')
                .then(() => {
                    expect(changeStatus).toHaveBeenCalledWith('publish');
                })
        );
    });
});
