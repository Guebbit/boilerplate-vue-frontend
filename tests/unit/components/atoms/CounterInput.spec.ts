import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormCounterInput from '@/components/molecules/FormCounterInput.vue';
import vuetify from '@/plugins/vuetify';

/**
 * FormCounterInput wraps Vuetify's v-number-input, so tests mount with the
 * app's Vuetify plugin and use Vuetify's own data-testid hooks
 * (increment/decrement) for the split control buttons.
 */
const mountCounter = (props: Record<string, unknown> = {}) =>
    mount(FormCounterInput, {
        props,
        global: { plugins: [vuetify] }
    });

describe('CounterInput component UNIT TEST', () => {
    it('Renders the component', () => {
        expect(mountCounter().exists()).toBe(true);
    });

    it('Expect X = 5', () => {
        const mountedComponent = mountCounter({ modelValue: 5 });
        expect((mountedComponent.find('input').element as HTMLInputElement).value).toBe('5');
    });

    it('Expect 2 <= X <= 9', async () => {
        const mountedComponent = mountCounter({ modelValue: 8, min: 2, max: 9 });

        // find elements
        const addButtonElement = mountedComponent.find('[data-testid=increment]');
        const subButtonElement = mountedComponent.find('[data-testid=decrement]');
        const inputElement = mountedComponent.find('input').element as HTMLInputElement;

        // the split controls step on pointerdown (hold-to-repeat)
        const press = async (button: typeof addButtonElement) => {
            await button.trigger('pointerdown');
            await button.trigger('pointerup');
            await mountedComponent.vm.$nextTick();
        };

        // Start adding and subtracting
        expect(inputElement.value).toBe('8');
        await press(addButtonElement);
        expect(inputElement.value).toBe('9');

        // capped at max: the increment button is disabled
        expect(addButtonElement.attributes('disabled')).toBeDefined();
        await press(addButtonElement);
        expect(inputElement.value).toBe('9');

        // set value to 3
        await mountedComponent.setProps({ modelValue: 3 });
        await mountedComponent.vm.$nextTick();
        expect(inputElement.value).toBe('3');

        // start subtracting
        await press(subButtonElement);
        expect(inputElement.value).toBe('2');

        // capped at min: the decrement button is disabled
        expect(subButtonElement.attributes('disabled')).toBeDefined();
        await press(subButtonElement);
        expect(inputElement.value).toBe('2');
    });
});
