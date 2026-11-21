/**
 * The staff idle clock on the session store: read from the server's own answer, moved on by this
 * tab's requests, and cleared with the session. Only the transport is mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { SessionActivity } from '@types';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import { parseOrvalFixture } from '../../support/unit/orval-fixture-schema.ts';

/** What `POST /account/sessions/current/touch` answers in the case at hand. */
let touchAnswer: unknown;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                config.url === '/account/sessions/current/touch' ? touchAnswer : undefined
            )
        )
    )
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockClear();
});

/** What the server answers a sign-in or `GET /account` with, besides the account itself. */
const answer = (activity: SessionActivity) => ({
    abilities: {
        platform: [],
        tenant: [],
        version: 1,
        grantableRoles: [],
        secondFactorRequired: false
    },
    activity
});

/** A staff answer: 30 minutes of idle time, 20 of them left, 2 hours before the cap. */
const STAFF_ACTIVITY: SessionActivity = {
    lastActiveAt: '2026-10-14T10:00:00.000Z',
    idleTimeoutSeconds: 1800,
    idleRemainingSeconds: 1200,
    lifetimeRemainingSeconds: 7200
};

/** The browser's own "now" in the cases: three hours AHEAD of the server's timestamp above. */
const BROWSER_NOW = Date.parse('2026-10-14T13:00:00.000Z');

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BROWSER_NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe('the idle clock, carried by the answer that sets the viewer', () => {
    const viewer = { id: 'u1', email: 'a@example.com' };

    it('counts down from the seconds the server says are left, with no touch asked', () => {
        const session = useSessionStore();

        session.setViewer(viewer, answer(STAFF_ACTIVITY));

        expect(session.idle).toEqual({ timeoutMs: 1_800_000, endsAt: BROWSER_NOW + 1_200_000 });
        expect(session.lifetimeEndsAt).toBe(BROWSER_NOW + 7_200_000);
        expect(vi.mocked(orvalMutator)).not.toHaveBeenCalled();
    });

    it.each([-3_600_000, 3_600_000])(
        'is not moved by a browser clock that is %i ms off the server’s',
        (skew) => {
            vi.setSystemTime(BROWSER_NOW + skew);
            const session = useSessionStore();

            session.setViewer(viewer, answer(STAFF_ACTIVITY));

            // The server's `lastActiveAt` (3 h behind the browser) is never read for the deadline.
            expect(session.idle?.endsAt).toBe(BROWSER_NOW + skew + 1_200_000);
        }
    );

    it('stays empty for a shopper, and is cleared with the session', () => {
        const session = useSessionStore();
        session.setViewer(viewer, answer({ lastActiveAt: '2026-10-14T10:00:00.000Z' }));
        expect(session.idle).toBeUndefined();
        expect(session.lifetimeEndsAt).toBeUndefined();

        session.setViewer(viewer, answer(STAFF_ACTIVITY));
        session.clearSession();

        expect(session.idle).toBeUndefined();
        expect(session.lifetimeEndsAt).toBeUndefined();
    });

    it('has no lifetime deadline while the cap is off, and still the idle one', () => {
        const session = useSessionStore();

        session.setViewer(
            viewer,
            answer({ ...STAFF_ACTIVITY, lifetimeRemainingSeconds: undefined })
        );

        expect(session.idle).toBeDefined();
        expect(session.lifetimeEndsAt).toBeUndefined();
    });

    it('keeps the rules already held when an answer carries none', () => {
        const session = useSessionStore();
        session.setAbilities({ tenant: [['read', 'Product']], platform: [] });
        session.setViewer(viewer);

        expect(session.tenantAbility.can('read', 'Product')).toBe(true);
    });
});

describe('the idle clock', () => {
    it('is read from the server on a touch, in this client’s own milliseconds', async () => {
        touchAnswer = STAFF_ACTIVITY;
        const session = useSessionStore();

        await session.touchSession();

        expect(session.idle).toEqual({ timeoutMs: 1_800_000, endsAt: BROWSER_NOW + 1_200_000 });
        expect(session.lifetimeEndsAt).toBe(BROWSER_NOW + 7_200_000);
    });

    it('is absent for a shopper, whose answer names no timeout', async () => {
        touchAnswer = { lastActiveAt: '2026-10-14T10:00:00.000Z' };
        const session = useSessionStore();

        await session.touchSession();

        expect(session.idle).toBeUndefined();
    });

    it('moves on with this tab’s own requests, a save interval short of the full timeout', async () => {
        touchAnswer = STAFF_ACTIVITY;
        const session = useSessionStore();
        await session.touchSession();
        vi.setSystemTime(BROWSER_NOW + 300_000);

        session.noteActivity();

        // Timeout minus the server's one-minute stamp interval: never past what the server grants.
        expect(session.idle?.endsAt).toBe(BROWSER_NOW + 300_000 + 1_800_000 - 60_000);
    });

    it('leaves a 25-minute pause outside the two-minute warning window, and opens it at 27', async () => {
        touchAnswer = STAFF_ACTIVITY;
        const session = useSessionStore();
        await session.touchSession();
        session.noteActivity();
        const warnsAt = (pauseMs: number) =>
            (session.idle?.endsAt ?? 0) - (BROWSER_NOW + pauseMs) <= 120_000;

        // The guess is the timeout less the server's one-minute stamp interval: 29 minutes.
        expect(warnsAt(25 * 60_000)).toBe(false);
        expect(warnsAt(27 * 60_000)).toBe(true);
    });

    it('never moves the lifetime deadline, whatever the person does', async () => {
        touchAnswer = STAFF_ACTIVITY;
        const session = useSessionStore();
        await session.touchSession();

        session.noteActivity();

        expect(session.lifetimeEndsAt).toBe(BROWSER_NOW + 7_200_000);
    });

    it('ends with the session, and says it ended for inactivity', async () => {
        touchAnswer = STAFF_ACTIVITY;
        const session = useSessionStore();
        await session.touchSession();

        session.signalIdle();

        expect(session.idle).toBeUndefined();
        expect(session.idleSignal).toBe(1);
        expect(session.expiredSignal).toBe(0);
    });

    it('survives a failed read: the server stays the authority', async () => {
        vi.mocked(orvalMutator).mockRejectedValueOnce(new Error('network down'));
        const session = useSessionStore();

        await expect(session.touchSession()).resolves.toBeUndefined();
        expect(session.idle).toBeUndefined();
    });
});
