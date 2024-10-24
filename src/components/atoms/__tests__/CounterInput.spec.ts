import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CounterInput from '../CounterInput.vue'

describe('CounterInput component UNIT TEST', () => {
    it('Renders the component', () =>
        expect(mount(CounterInput).exists()).toBe(true)
    );

    it('Expect X = 5', () => {
        const mountedComponent = mount(CounterInput, {
            props: {
                modelValue: 5
            }
        });
        expect(mount(CounterInput).classes()).toContain('counter-input');
        expect((mountedComponent.find('.counter-input input').element as HTMLInputElement).value).toBe('5');
    });

    it('Expect 2 <= X <= 9', async () => {
        const mountedComponent = mount(CounterInput, {
            props: {
                modelValue: 8,
                min: 2,
                max: 9
            }
        });

        // find elements
        const addButtonElement = mountedComponent.find('.counter-add');
        const subButtonElement = mountedComponent.find('.counter-sub');
        const inputElement =  mountedComponent.find('.counter-input input').element as HTMLInputElement;

        // Start adding and subtracting
        expect(inputElement.value).toBe('8');
        await addButtonElement.trigger('click');
        // start adding
        await mountedComponent.vm.$nextTick();
        expect(inputElement.value).toBe('9');
        // now it's capped
        await addButtonElement.trigger('click');
        await addButtonElement.trigger('click');
        await addButtonElement.trigger('click');
        await addButtonElement.trigger('click');
        await addButtonElement.trigger('click');
        await mountedComponent.vm.$nextTick();
        expect(inputElement.value).toBe('9');
        // set value to 3 (inputElement.value = 3; // this works but it's not correctly registered by vitest)
        await mountedComponent.setProps({ modelValue: 3 });
        // start subtracting
        await mountedComponent.vm.$nextTick();
        expect(inputElement.value).toBe('3');
        await subButtonElement.trigger('click');
        await mountedComponent.vm.$nextTick();
        expect(inputElement.value).toBe('2');
        // now it's capped again
        await subButtonElement.trigger('click');
        await subButtonElement.trigger('click');
        await subButtonElement.trigger('click');
        await subButtonElement.trigger('click');
        await subButtonElement.trigger('click');
        expect(inputElement.value).toBe('2');
    });
})
