import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRealtimeChatStore } from '@/stores/realtimeChat';
import type { IRealtimeChatEntry, IChatJoinedEvent, IChatPresenceUpdatedEvent } from '@types';

// Helpers to build typed test payloads
const makeEntry = (id: string, text: string): IRealtimeChatEntry => ({
    id,
    kind: 'message',
    text,
    timestamp: '2026-01-01T00:00:00.000Z',
    username: 'alice'
});

const makeJoinedEvent = (): IChatJoinedEvent => ({
    type: 'chat:joined',
    payload: { username: 'alice', room: 'general' }
});

const makePresenceEvent = (): IChatPresenceUpdatedEvent => ({
    type: 'chat:presence',
    payload: { room: 'general', users: ['alice', 'bob'] }
});

describe('useRealtimeChatStore', () => {
    beforeEach(() => {
        // Fresh Pinia instance before every test so stores don't bleed state
        setActivePinia(createPinia());
    });

    it('initialises with idle status and empty collections', () => {
        const store = useRealtimeChatStore();

        expect(store.status).toBe('idle');
        expect(store.username).toBe('');
        expect(store.entries).toEqual([]);
        expect(store.presence).toBeUndefined();
        expect(store.joined).toBeUndefined();
        expect(store.lastError).toBeUndefined();
    });

    it('updates connection status via setStatus', () => {
        const store = useRealtimeChatStore();

        store.setStatus('connecting');
        expect(store.status).toBe('connecting');

        store.setStatus('open');
        expect(store.status).toBe('open');
    });

    it('stores the active username via setUsername', () => {
        const store = useRealtimeChatStore();

        store.setUsername('alice');

        expect(store.username).toBe('alice');
    });

    it('appends chat entries via addEntry', () => {
        const store = useRealtimeChatStore();

        store.addEntry(makeEntry('1', 'hello'));
        store.addEntry(makeEntry('2', 'world'));

        expect(store.entries).toHaveLength(2);
        expect(store.entries[0].text).toBe('hello');
        expect(store.entries[1].text).toBe('world');
    });

    it('caps the entries list at 100 items', () => {
        const store = useRealtimeChatStore();

        for (let index = 0; index < 110; index++) {
            store.addEntry(makeEntry(String(index), `msg ${index}`));
        }

        expect(store.entries).toHaveLength(100);
        // Oldest entries are dropped; the last entry should be the newest
        expect(store.entries.at(-1).text).toBe('msg 109');
    });

    it('stores the joined event via setJoined', () => {
        const store = useRealtimeChatStore();
        const event = makeJoinedEvent();

        store.setJoined(event);

        expect(store.joined).toEqual(event);
    });

    it('stores the presence event via setPresence', () => {
        const store = useRealtimeChatStore();
        const event = makePresenceEvent();

        store.setPresence(event);

        expect(store.presence).toEqual(event);
    });

    it('stores the latest error message via setError', () => {
        const store = useRealtimeChatStore();

        store.setError('connection refused');

        expect(store.lastError).toBe('connection refused');
    });

    it('overwrites presence and joined when actions are called again', () => {
        const store = useRealtimeChatStore();

        store.setJoined(makeJoinedEvent());
        const newJoined: IChatJoinedEvent = {
            type: 'chat:joined',
            payload: { username: 'bob', room: 'general' }
        };
        store.setJoined(newJoined);

        expect(store.joined?.payload.username).toBe('bob');
    });
});
