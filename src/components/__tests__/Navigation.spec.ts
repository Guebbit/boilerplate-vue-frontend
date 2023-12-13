import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Navigation from '../Navigation.vue'

describe('HelloWorld', () =>
    it('renders properly', () => expect(mount(Navigation)).toBeTruthy)
)
