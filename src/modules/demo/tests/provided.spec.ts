/**
 * @module
 * `src/modules/demo/provided.ts` — the typed provide/inject pair.
 *
 * Driven through a real parent/child mount rather than by calling the two functions directly:
 * `provide`/`inject` only resolve inside a component instance, and the claim worth testing is that
 * a descendant receives the SAME ref the provider holds, not that two functions return objects.
 */
import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { provideVariable, providedVariableKey, useProvidedVariable } from '@/modules/demo/provided';
import type { ProvidedVariableContext } from '@/modules/demo/provided';

/**
 * What the last mount's two sides captured, written by the components below as they set up.
 *
 * Module-level rather than per-call because the components have to be too: defining them inside a
 * helper puts their render functions in a nested scope, which the lint forbids.
 */
let parentContext: ProvidedVariableContext | undefined;
let childContext: ProvidedVariableContext | undefined;

/**
 * The descendant, one level below the provider, so the lookup crosses a component boundary.
 *
 * `render` as an option rather than a closure returned from `setup`: the two are equivalent to
 * Vue, and only this spelling keeps the render function out of a nested scope.
 */
const Child = defineComponent({
    setup() {
        childContext = useProvidedVariable();
    },
    render() {
        return h('span', childContext!.providedVariable.value);
    }
});

/** The provider, rendering the child inside its own tree. */
const Parent = defineComponent({
    setup() {
        parentContext = provideVariable();
    },
    render() {
        return h('div', [h(Child)]);
    }
});

/**
 * Mounts the pair, handing back both sides' contexts.
 */
const mountPair = () => {
    const wrapper = mount(Parent);
    return { wrapper, parent: parentContext!, child: childContext! };
};

describe('provideVariable', () => {
    it('starts at the playground default', () => {
        const { parent } = mountPair();

        expect(parent.providedVariable.value).toBe('From the Playground');
    });

    it('returns the same pair it provides, so the provider can use it too', () => {
        const { parent, child } = mountPair();

        expect(child.providedVariable).toBe(parent.providedVariable);
        expect(child.setProvidedVariable).toBe(parent.setProvidedVariable);
    });

    it('writes through to the descendant that injected it', async () => {
        const { wrapper, parent } = mountPair();
        parent.setProvidedVariable('Written by the parent');
        await nextTick();

        expect(wrapper.text()).toBe('Written by the parent');
    });

    /**
     * The default parameter is the point of the mutation: `setProvidedVariable()` with no argument
     * clears the value rather than writing `undefined` into a `Ref<string>`.
     */
    it('clears to an empty string when called with no value', () => {
        const { parent } = mountPair();
        parent.setProvidedVariable('something');
        parent.setProvidedVariable();

        expect(parent.providedVariable.value).toBe('');
    });

    it('gives each provider its own state', () => {
        const first = mountPair();
        const second = mountPair();
        first.parent.setProvidedVariable('only mine');

        expect(second.parent.providedVariable.value).toBe('From the Playground');
    });
});

describe('providedVariableKey', () => {
    /**
     * A `Symbol` rather than the string `'providedVariable'`: a magic string has to be spelled the
     * same way in two files and nothing checks that it was.
     */
    it('is a symbol, so no string can collide with it', () => {
        expect(typeof providedVariableKey).toBe('symbol');
        expect(String(providedVariableKey)).toContain('demo:providedVariable');
    });
});
