/**
 * `PasswordStrengthMeter.vue` — renders nothing for an empty password, and never blocks
 * submission; the breach warning is a SEPARATE component beside this one
 * (`use-password-breach-check.ts`'s own hint), not duplicated here.
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import PasswordStrengthMeter from '@/modules/account/components/PasswordStrengthMeter.vue';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

const score = ref<0 | 1 | 2 | 3 | 4>();

vi.mock('@/modules/account/composables/use-password-strength.ts', () => ({
    usePasswordStrength: () => ({ score })
}));

const mountMeter = (password: string) =>
    mount(PasswordStrengthMeter, { props: { password }, global: { plugins: [i18n, vuetify] } });

describe('PasswordStrengthMeter', () => {
    it('renders nothing for an empty password', async () => {
        await loadLocale('en');
        score.value = undefined;

        expect(mountMeter('').find('[data-test="password-strength-meter"]').exists()).toBe(false);
    });

    it('shows the bar and label once there is a score', async () => {
        await loadLocale('en');
        score.value = 4;

        const wrapper = mountMeter('correct-horse');

        expect(wrapper.find('[data-test="password-strength-meter"]').exists()).toBe(true);
        expect(wrapper.text()).toContain('Strong');
    });

    it('never renders a breach warning — that is a separate component', () => {
        score.value = 0;

        expect(mountMeter('weak').find('[data-test="password-breached-warning"]').exists()).toBe(
            false
        );
    });
});
