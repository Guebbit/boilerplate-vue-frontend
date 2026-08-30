/**
 * `FormCard.vue` — the card `ProductCreate` and `UserCreate` submit through.
 *
 * The component itself is markup, and markup is not what this pins. What it pins is the seam the
 * markup created: the `<form>` now lives one level below the page that owns the form state, and
 * `useAppForm` reaches it through `defineExpose`. That indirection is invisible when it breaks —
 * a page whose `formElement` resolves to `undefined` still shows its errors, it just never moves
 * focus, which is a screen-reader user submitting into silence. `tests/cross-cutting/form-idiom`
 * checks that a page PASSES a `formElement`; only this checks there is something on the other end.
 *
 * The slotted fields are asserted to be inside that same element for the same reason: focus is
 * found by querying the container, so fields rendered beside it would be fields nothing can find.
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import type { Ref } from 'vue';
import FormCard from '@/ui/organisms/FormCard.vue';
import vuetify from '@/ui/vuetify';

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale/products', name: 'ProductsList', component: { template: '<div />' } }
    ]
});

const mountCard = () =>
    mount(FormCard, {
        props: {
            submitLabel: 'Save',
            backTo: { name: 'ProductsList' },
            backLabel: 'Back to the list'
        },
        slots: { default: '<input class="field" name="title" />' },
        global: { plugins: [vuetify, router] }
    });

/**
 * What a parent's template ref actually receives.
 *
 * Read off `$.exposed` rather than `wrapper.vm`, and that is the entire point: a `<script setup>`
 * component is CLOSED, so `wrapper.vm` reaches its bindings whether they are exposed or not, and
 * an assertion through it passes with the `defineExpose` deleted — while the page it exists for
 * breaks.
 */
const exposedFormOf = (wrapper: ReturnType<typeof mountCard>) =>
    (wrapper.vm.$.exposed as { formElement?: Ref<HTMLFormElement | undefined> } | null)?.formElement
        ?.value;

describe('FormCard — the seam between the page and its form', () => {
    it('exposes the form element itself, not a wrapper around it', () => {
        const wrapper = mountCard();

        // What `useAppForm` receives, and what it will call `querySelector` on.
        expect(exposedFormOf(wrapper)).toBe(wrapper.find('form').element);
    });

    it('renders the slotted fields inside that element', () => {
        const wrapper = mountCard();

        expect(exposedFormOf(wrapper)?.querySelector('.field')).not.toBeNull();
    });

    it('reports a submit to the page rather than letting the browser send the form', () => {
        const wrapper = mountCard();

        return wrapper
            .find('form')
            .trigger('submit')
            .then(() => {
                expect(wrapper.emitted('submit')).toHaveLength(1);
            });
    });
});
