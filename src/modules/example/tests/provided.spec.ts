/**
 * @module
 * `src/modules/example/provided.ts`, the typed provide/inject pair.
 *
 * Driven through a real parent/child mount rather than by calling the two functions directly:
 * `provide`/`inject` only resolve inside a component instance, and the claim worth testing is that
 * a descendant receives the SAME ref and the SAME mutation the provider holds.
 */
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { provideExample, providedExampleKey, useProvidedExample } from '@/modules/example/provided';
import type { ProvidedExample } from '@/modules/example/provided';
import type { Example } from '@types';

/**
 * What the last mount's descendant captured, written by the child as it sets up. Module-level
 * because the components have to be too: defining them inside a helper puts their render
 * functions in a nested scope, which the lint forbids.
 */
let childContext: ProvidedExample | undefined;

/**
 * The descendant, one level below the provider, so the lookup crosses a component boundary.
 */
const Child = defineComponent({
    setup() {
        childContext = useProvidedExample();
    },
    render() {
        return h('span', childContext!.example.value?.title ?? 'none');
    }
});

/**
 * Mounts a provider holding `provided`, with the child inside its tree.
 *
 * @param provided - What the provider hands down.
 */
const mountPair = (provided: ProvidedExample) => {
    const Parent = defineComponent({
        setup() {
            provideExample(provided);
        },
        render() {
            return h('div', [h(Child)]);
        }
    });
    return mount(Parent);
};

/** A minimal example for the ref to hold. */
const AN_EXAMPLE = { id: 'a', title: 'Hello' } as Example;

describe('provideExample', () => {
    it('hands the descendant the same ref and the same mutation', () => {
        const provided: ProvidedExample = {
            example: ref(AN_EXAMPLE),
            changeStatus: vi.fn().mockResolvedValue(undefined)
        };
        mountPair(provided);

        expect(childContext?.example).toBe(provided.example);
        expect(childContext?.changeStatus).toBe(provided.changeStatus);
    });

    it('writes through to the descendant when the provider’s ref changes', async () => {
        const example = ref<Example | undefined>(AN_EXAMPLE);
        const wrapper = mountPair({ example, changeStatus: vi.fn() });
        expect(wrapper.text()).toBe('Hello');

        example.value = { ...AN_EXAMPLE, title: 'Changed' };
        await nextTick();

        expect(childContext?.example.value?.title).toBe('Changed');
    });

    it('lets a descendant ask for a status change without touching the ref', () => {
        const changeStatus = vi.fn().mockResolvedValue(undefined);
        mountPair({ example: ref(AN_EXAMPLE), changeStatus });

        void childContext?.changeStatus('published');

        expect(changeStatus).toHaveBeenCalledWith('published');
    });
});

describe('providedExampleKey', () => {
    /**
     * A `Symbol` rather than a string: a magic string has to be spelled the same way in two files
     * and nothing checks that it was.
     */
    it('is a symbol, so no string can collide with it', () => {
        expect(typeof providedExampleKey).toBe('symbol');
        expect(String(providedExampleKey)).toContain('example:provided');
    });
});
