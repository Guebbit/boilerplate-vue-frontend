<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'HumanCheck'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Provider-neutral human-challenge widget. Reads `GET /antibot/config` on mount and renders
 * whichever vendor is currently active: nothing for `none`, ALTCHA's web component for `altcha`,
 * Cloudflare Turnstile's vendor script for `turnstile`. A hosting form reads {@link token} through
 * a template ref once the visitor passes, and attaches it as `x-antibot-challenge-token` on its
 * own submit via `withAntibotToken` — this component never calls the route it protects.
 *
 * See the paired backend's `docs/modules/antibot.md` for the provider registry and the ladder
 * this is rung 3 of.
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { fetchAntibotConfig, fetchAntibotChallenge } from '@/infrastructure/http/antibot.ts';
import { logger } from '@/infrastructure/utils/logger.ts';
import 'altcha';
import type { AltchaWidgetElement } from 'altcha';

/**
 * Emitted the moment either vendor hands back a usable token — a hosting form may listen to
 * auto-enable its own retry button rather than polling {@link token}.
 */
const emit = defineEmits<(event: 'solved', token: string) => void>();

/**
 * The active provider's name, `undefined` while `GET /antibot/config` is still in flight.
 * `'none'` renders nothing; anything else picks one branch below.
 */
const provider = ref<string>();

/**
 * The solved challenge token, `undefined` until the visitor passes. Read by the hosting form
 * through a template ref (`humanCheckRef.value?.token`).
 */
const token = ref<string>();

/** The mounted `<altcha-widget>`, once the `altcha` branch renders it. */
const altchaElement = ref<AltchaWidgetElement>();

/** Container Cloudflare Turnstile's `render()` mounts its iframe into. */
const turnstileElement = ref<HTMLDivElement>();

/** Turnstile's own widget id, needed to remove it cleanly on unmount. */
let turnstileWidgetId: string | undefined;

/**
 * Cloudflare Turnstile: the subset of its global this component calls. Read through a narrowing
 * cast rather than a `declare global` augmentation — `<script setup>` is function-scoped once
 * compiled, and vue-tsc rejects an ambient declaration there as not top-level. No npm wrapper for
 * one script and one `render()` call.
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */
interface TurnstileGlobal {
    render: (container: HTMLElement, options: Record<string, unknown>) => string;
    remove: (widgetId: string) => void;
}

/**
 * Reads Cloudflare's `globalThis.turnstile`, once its vendor script has attached it.
 *
 * @returns The global, or `undefined` before the script has loaded.
 */
const turnstileGlobal = (): TurnstileGlobal | undefined =>
    // Single cast narrowing an untyped vendor global — `globalThis` is a real, concrete type
    // here, never `unknown`, so this is not the laundering `as unknown as X` pattern.
    (globalThis as typeof globalThis & { turnstile?: TurnstileGlobal }).turnstile;

/**
 * Loads a vendor `<script>` exactly once per `src` and resolves once it has run — a second
 * `HumanCheck` on the same page (e.g. after a route change) reuses the first load instead of
 * injecting a duplicate.
 *
 * @param src - The script's URL.
 * @returns A promise resolving once the script has loaded.
 */
const loadVendorScript = (src: string): Promise<void> => {
    const existing = document.querySelector<HTMLScriptElement>(
        `script[data-antibot-vendor="${src}"]`
    );
    if (existing)
        return existing.dataset.loaded === 'true'
            ? Promise.resolve()
            : new Promise((resolve) =>
                  existing.addEventListener('load', () => resolve(), { once: true })
              );

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.antibotVendor = src;
        script.addEventListener(
            'load',
            () => {
                script.dataset.loaded = 'true';
                resolve();
            },
            { once: true }
        );
        script.addEventListener(
            'error',
            () => reject(new Error(`HumanCheck: failed to load ${src}`)),
            { once: true }
        );
        document.head.append(script);
    });
};

/**
 * Fetches a fresh ALTCHA challenge and hands it to the widget's `.configure()` — the documented
 * way to pass the challenge OBJECT rather than a URL, since the envelope every route answers in
 * wraps it under `data` and the widget's own built-in fetch expects it unwrapped.
 * https://github.com/altcha-org/altcha#programmatic-configuration
 */
const configureAltcha = (): Promise<void> =>
    fetchAntibotChallenge().then((envelope) => {
        const widget = altchaElement.value;
        // `typeof widget.configure === 'function'` rather than just checking `widget`: custom
        // elements upgrade the instant `customElements.define` has run, which happens at import
        // time above — but a widget that failed to load its script is still a plain, unupgraded
        // element sitting in the DOM, and calling a method it never gained would throw.
        if (!widget || typeof widget.configure !== 'function') return;
        // No cast needed: `AntibotChallenge` (generated from the contract) and ALTCHA's own
        // `Challenge` describe the same wire shape — the backend issues exactly what altcha-lib
        // produced — so this is a plain structural match.
        return widget.configure({ challenge: envelope.data });
    });

/**
 * Reads the solved payload off ALTCHA's `verified` event and stores it as {@link token}.
 * https://github.com/altcha-org/altcha#events
 */
const onAltchaVerified = (event: Event): void => {
    const { payload } = (event as CustomEvent<{ payload?: string }>).detail;
    if (!payload) return;
    token.value = payload;
    emit('solved', payload);
};

/**
 * Cloudflare Turnstile: renders the widget into {@link turnstileElement}. `sitekey` is the public
 * half of the pair `GET /antibot/config` published; `callback` is how Turnstile hands back the
 * solved token — there is no DOM event to listen for instead.
 * https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */
const renderTurnstile = (siteKey: string): void => {
    const container = turnstileElement.value;
    const turnstile = turnstileGlobal();
    if (!container || !turnstile) return;
    turnstileWidgetId = turnstile.render(container, {
        sitekey: siteKey,
        callback: (solvedToken: string) => {
            token.value = solvedToken;
            emit('solved', solvedToken);
        }
    });
};

/**
 * Reads the active provider and renders its branch. `nextTick` is required, not defensive: setting
 * `provider` only SCHEDULES the `v-if`/`v-else-if` branch's DOM update, so `altchaElement`/
 * `turnstileElement` are still `undefined` in the microtask right after the assignment.
 */
onMounted(() => {
    void fetchAntibotConfig()
        .then((envelope) => {
            provider.value = envelope.data.provider;
            const activeProvider = provider.value;
            if (activeProvider !== 'turnstile' && activeProvider !== 'altcha') return;

            return nextTick().then(() => {
                if (activeProvider === 'turnstile') {
                    const { siteKey, scriptUrl } = envelope.data.parameters;
                    if (!siteKey || !scriptUrl) return;
                    return loadVendorScript(scriptUrl).then(() => renderTurnstile(siteKey));
                }
                return configureAltcha();
            });
        })
        // An unreachable API or a vendor script that would not load leaves the widget absent, and
        // nothing else: the health banner already says the API is down, and the form's own submit
        // reports its refusal. Left uncaught, it is an unhandled rejection on every page that
        // hosts a check.
        .catch((error: unknown) => {
            logger.warn('HumanCheck: the human check could not be prepared', error);
        });
});

onBeforeUnmount(() => {
    if (turnstileWidgetId) turnstileGlobal()?.remove(turnstileWidgetId);
});

defineExpose({
    /** The solved token, or `undefined` until the visitor passes. */
    token
});
</script>

<template>
    <div v-if="provider === 'altcha'" data-test="human-check-altcha">
        <altcha-widget ref="altchaElement" @verified="onAltchaVerified" />
    </div>
    <div
        v-else-if="provider === 'turnstile'"
        ref="turnstileElement"
        data-test="human-check-turnstile"
    />
</template>
