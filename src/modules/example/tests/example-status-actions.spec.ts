/**
 * @module
 * The injecting half of the provide/inject pair: it renders exactly the moves the server listed in
 * `actions.transitions` (it decides none of its own), and asks the provider, never the store, to
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
import type { Example, ExampleStatus } from '@types';

wireModulesIntoCore();

/**
 * Mounts the actions under a provider holding an example of `status`.
 *
 * @param transitions - The moves the server listed, or `undefined` while the example loads.
 * @param changeStatus - What the provider does when asked.
 */
const mountUnder = (
    transitions: ExampleStatus[] | undefined,
    changeStatus: (next: ExampleStatus) => Promise<unknown> = vi.fn().mockResolvedValue(undefined)
) => {
    const Provider = defineComponent({
        setup() {
            provideExample({
                example: ref(
                    transitions
                        ? ({
                              id: 'a',
                              status: 'draft',
                              actions: { transitions, update: true, delete: true }
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
 * The status each rendered move button leads to.
 *
 * @param wrapper - The mounted provider.
 */
const offered = (wrapper: Awaited<ReturnType<typeof mountUnder>>) =>
    wrapper.findAll('[data-test^=example-move-]').map((button) => button.attributes('data-test'));

describe('ExampleStatusActions', () => {
    it.each([
        [
            ['published', 'archived'],
            ['example-move-published', 'example-move-archived']
        ],
        [['archived'], ['example-move-archived']],
        [['draft'], ['example-move-draft']],
        [[], []]
    ] as const)('renders the moves the server lists: %j', (transitions, expected) =>
        mountUnder([...transitions]).then((wrapper) => {
            expect(offered(wrapper)).toEqual(expected);
        })
    );

    it('offers nothing while the example is still loading', () =>
        mountUnder(undefined).then((wrapper) => {
            expect(offered(wrapper)).toEqual([]);
        }));

    it('asks the provider for the move a button names', () => {
        const changeStatus = vi.fn().mockResolvedValue(undefined);

        return mountUnder(['published'], changeStatus).then((wrapper) =>
            wrapper
                .get('[data-test=example-move-published]')
                .trigger('click')
                .then(() => {
                    expect(changeStatus).toHaveBeenCalledWith('published');
                })
        );
    });
});
