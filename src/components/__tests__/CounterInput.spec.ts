import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CounterInput from '../CounterInput.vue'

describe('Example', () => {
    const component =
        mount(CounterInput,
            {
                props: {
                    modelValue: 5,
                    min: 2,
                    max: 9
                }
            });
    console.log(component.text())
    it('renders properly', () => expect(component.text()).toContain('5'))
})
