/**
 * @module
 * `use-countdown.ts` — `useCountdown`'s own ticking is already exercised through the store
 * (`two-factor-store.spec.ts`'s "the resend countdown"); this covers `useCountdownAnnouncement`
 * (FA82) directly: a screen reader must hear 60/30/10s and "expired", never every one of 300
 * individual ticks a five-minute challenge counts through.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { effectScope, ref } from 'vue';
import type { EffectScope } from 'vue';
import { useCountdownAnnouncement } from '@/modules/account/composables/use-countdown.ts';

/** Renders a threshold into the same shape a caller's own i18n `message` callback would. */
const message = (seconds: number) => `expires in ${seconds}s`;
const expiredMessage = () => 'expired';

let scope: EffectScope;

beforeEach(() => {
    scope = effectScope();
});

afterEach(() => scope.stop());

describe('useCountdownAnnouncement', () => {
    it('announces nothing above the highest threshold', () => {
        const secondsLeft = ref(300);
        const { announcement } = scope.run(() =>
            useCountdownAnnouncement(secondsLeft, message, expiredMessage)
        )!;

        expect(announcement.value).toBeUndefined();
    });

    it('announces the 60s mark once secondsLeft drops to it, and not again above it', () => {
        const secondsLeft = ref(300);
        const { announcement } = scope.run(() =>
            useCountdownAnnouncement(secondsLeft, message, expiredMessage)
        )!;

        secondsLeft.value = 61;
        expect(announcement.value).toBeUndefined();

        secondsLeft.value = 60;
        expect(announcement.value).toBe('expires in 60s');

        secondsLeft.value = 45;
        // Still inside the 60s band — the whole point: a screen reader hears this ONCE, not on
        // every one of the 15 ticks between 60 and 45.
        expect(announcement.value).toBe('expires in 60s');
    });

    it('announces each of 60, 30 and 10 exactly once, in order, as the countdown passes them', () => {
        const secondsLeft = ref(65);
        const { announcement } = scope.run(() =>
            useCountdownAnnouncement(secondsLeft, message, expiredMessage)
        )!;

        const seen: (string | undefined)[] = [];
        for (const value of [65, 60, 45, 30, 15, 10, 5]) {
            secondsLeft.value = value;
            seen.push(announcement.value);
        }

        expect(seen).toEqual([
            undefined,
            'expires in 60s',
            'expires in 60s',
            'expires in 30s',
            'expires in 30s',
            'expires in 10s',
            'expires in 10s'
        ]);
    });

    it('announces the expired message once secondsLeft reaches 0, and holds it there', () => {
        const secondsLeft = ref(5);
        const { announcement } = scope.run(() =>
            useCountdownAnnouncement(secondsLeft, message, expiredMessage)
        )!;

        secondsLeft.value = 0;
        expect(announcement.value).toBe('expired');

        // `useCountdown` itself clamps at 0 and stops ticking, but the announcement must not
        // flip back to a stale threshold if anything ever re-reads a lower value.
        secondsLeft.value = 0;
        expect(announcement.value).toBe('expired');
    });

    it('announces the nearest crossed threshold even when a tick skips straight past one', () => {
        // A stalled tab or a GC pause can skip a tick — the real failure mode this guards
        // against is staying silent for the rest of the countdown because the exact value
        // (60, or 30) was never actually seen.
        const secondsLeft = ref(65);
        const { announcement } = scope.run(() =>
            useCountdownAnnouncement(secondsLeft, message, expiredMessage)
        )!;

        secondsLeft.value = 25;
        expect(announcement.value).toBe('expires in 30s');
    });

    it('announces immediately when the countdown already starts inside a band', () => {
        const secondsLeft = ref(30);
        const { announcement } = scope.run(() =>
            useCountdownAnnouncement(secondsLeft, message, expiredMessage)
        )!;

        expect(announcement.value).toBe('expires in 30s');
    });
});
