import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import Navigation from '../Navigation.vue'

// TODO farlo con un component che accetta props e slots
describe('Example', () => {
    it('renders properly', () => {
        const wrapper = mount(Navigation, { props: { msg: 'Hello Vitest' } })
        expect(wrapper.text()).toContain('Hello Vitest')
    })
})
