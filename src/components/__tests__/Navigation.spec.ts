import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Navigation from '../organisms/Navigation.vue'

/**
 *
 */
describe('Navigation', () =>
    it('renders properly', () => expect(mount(Navigation)).toBeTruthy)
)
