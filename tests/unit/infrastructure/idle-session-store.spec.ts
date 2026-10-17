/**
 * The staff idle clock on the session store: read from the server's own answer, moved on by this
 * tab's requests, and cleared with the session. Only the transport is mocked.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../unit/infrastructure/http/orval-fixture-schema.ts';

/** What `POST /account/session/touch` answers in the case at hand. */
let touchAnswer: unknown;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                config.url === '/account/session/touch' ? touchAnswer : undefined
            )
        )
    )
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(orvalMutator).mockClear();
});

/** How many times the touch was asked. */
const touchesAsked = () =>
    vi.mocked(orvalMutator).mock.calls.filter(([config]) => config.url === '/account/session/touch')
        .length;

describe('the idle clock, asked when the viewer is set', () => {
    it('is read once per signed-in stretch, not at every viewer load', async () => {
        touchAnswer = orvalEnvelope({ lastActiveAt: '2026-10-14T10:00:00.000Z' });
        const session = useSessionStore();
        const viewer = { id: 'u1', email: 'a@example.com' };

        await session.setViewer(viewer);
        await session.setViewer(viewer);

        expect(touchesAsked()).toBe(1);
    });

    it('is asked again after the session ended', async () => {
        touchAnswer = orvalEnvelope({ lastActiveAt: '2026-10-14T10:00:00.000Z' });
        const session = useSessionStore();
        const viewer = { id: 'u1', email: 'a@example.com' };

        await session.setViewer(viewer);
        session.clearSession();
        await session.setViewer(viewer);

        expect(touchesAsked()).toBe(2);
    });
});

describe('the idle clock', () => {
    it('is read from the server on a touch, in this client’s own milliseconds', async () => {
        touchAnswer = orvalEnvelope({
            lastActiveAt: '2026-10-14T10:00:00.000Z',
            idleTimeoutSeconds: 1800
        });
        const session = useSessionStore();

        await session.touchSession();

        expect(session.idle).toEqual({
            timeoutMs: 1_800_000,
            lastActiveAt: Date.parse('2026-10-14T10:00:00.000Z')
        });
    });

    it('is absent for a shopper, whose answer names no timeout', async () => {
        touchAnswer = orvalEnvelope({ lastActiveAt: '2026-10-14T10:00:00.000Z' });
        const session = useSessionStore();

        await session.touchSession();

        expect(session.idle).toBeUndefined();
    });

    it('moves on with this tab’s own requests', async () => {
        touchAnswer = orvalEnvelope({
            lastActiveAt: '2026-10-14T10:00:00.000Z',
            idleTimeoutSeconds: 1800
        });
        const session = useSessionStore();
        await session.touchSession();

        session.noteActivity();

        expect(Date.now() - (session.idle?.lastActiveAt ?? 0)).toBeLessThan(5000);
    });

    it('ends with the session, and says it ended for inactivity', async () => {
        touchAnswer = orvalEnvelope({
            lastActiveAt: '2026-10-14T10:00:00.000Z',
            idleTimeoutSeconds: 1800
        });
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
