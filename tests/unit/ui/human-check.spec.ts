/**
 * `HumanCheck.vue` — the provider-neutral human-challenge widget. Its whole job is picking the
 * right BRANCH off `GET /antibot/config`'s answer; the real vendor widgets (`altcha`'s web
 * component, Cloudflare's `window.turnstile`) are mocked out entirely, since exercising them for
 * real would test a library, not this component.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import HumanCheck from '@/ui/organisms/HumanCheck.vue';
import { fetchAntibotConfig, fetchAntibotChallenge } from '@/infrastructure/http/antibot.ts';
import { asStub } from '../../support/stub.ts';

// Side-effect only: HumanCheck imports 'altcha' to register <altcha-widget>. Mocked to an empty
// module so no real custom-element/proof-of-work code runs — the branch under test is which tag
// gets rendered, not what the tag does once upgraded.
vi.mock('altcha', () => ({}));

vi.mock('@/infrastructure/http/antibot.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/infrastructure/http/antibot.ts')>();
    return { ...actual, fetchAntibotConfig: vi.fn(), fetchAntibotChallenge: vi.fn() };
});

beforeEach(() => {
    // The `altcha` branch always fetches a challenge once mounted; unresolved by default it would
    // reject `.then()` with "Cannot read properties of undefined" in every OTHER case too.
    vi.mocked(fetchAntibotChallenge).mockResolvedValue({
        success: true,
        status: 200,
        message: 'OK',
        data: {
            parameters: {
                algorithm: 'PBKDF2/SHA-256',
                nonce: 'nonce',
                salt: 'salt',
                cost: 1,
                keyLength: 32,
                keyPrefix: 'prefix'
            },
            signature: 'signature'
        }
    });
});

/**
 * A `GET /antibot/config` envelope for the given provider.
 *
 * @param provider - The provider name to answer with.
 * @param parameters - Its public parameters, empty for `none`.
 */
const config = (provider: string, parameters: Record<string, string> = {}) => ({
    success: true as const,
    status: 200,
    message: 'OK',
    data: {
        provider,
        parameters,
        rungs: { identityBudgets: true as const, emailPolicy: 'off' as const }
    }
});

afterEach(() => {
    for (const script of document.querySelectorAll('script[data-antibot-vendor]')) script.remove();
    vi.clearAllMocks();
});

describe('HumanCheck — provider branching', () => {
    it('renders nothing while the provider is none', async () => {
        vi.mocked(fetchAntibotConfig).mockResolvedValue(config('none'));

        const wrapper = mount(HumanCheck);
        await flushPromises();

        expect(wrapper.find('[data-test=human-check-altcha]').exists()).toBe(false);
        expect(wrapper.find('[data-test=human-check-turnstile]').exists()).toBe(false);
    });

    it('renders the altcha widget when altcha is active', async () => {
        vi.mocked(fetchAntibotConfig).mockResolvedValue(config('altcha'));

        const wrapper = mount(HumanCheck);
        await flushPromises();

        expect(wrapper.find('[data-test=human-check-altcha]').exists()).toBe(true);
        expect(wrapper.find('altcha-widget').exists()).toBe(true);
        expect(wrapper.find('[data-test=human-check-turnstile]').exists()).toBe(false);
    });

    it('loads the turnstile vendor script when turnstile is active', async () => {
        vi.mocked(fetchAntibotConfig).mockResolvedValue(
            config('turnstile', {
                siteKey: 'site-key-123',
                scriptUrl: 'https://challenges.cloudflare.com/turnstile/v0/api.js'
            })
        );

        const wrapper = mount(HumanCheck);
        await flushPromises();

        expect(wrapper.find('[data-test=human-check-turnstile]').exists()).toBe(true);
        expect(wrapper.find('[data-test=human-check-altcha]').exists()).toBe(false);
        expect(
            document.querySelector(
                'script[data-antibot-vendor="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
            )
        ).not.toBeNull();
    });

    it('exposes no token until the visitor solves the challenge', async () => {
        vi.mocked(fetchAntibotConfig).mockResolvedValue(config('altcha'));

        const wrapper = mount(HumanCheck);
        await flushPromises();

        expect(asStub<{ token?: string }>(wrapper.vm).token).toBeUndefined();
    });
});
