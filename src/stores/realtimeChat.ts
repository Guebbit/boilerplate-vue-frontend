import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
    IRealtimeConnectionStatus,
    IRealtimeChatEntry,
    IChatJoinedEvent,
    IChatPresenceUpdatedEvent
} from '@types';

export const useRealtimeChatStore = defineStore('realtime-chat', () => {
    const status = ref<IRealtimeConnectionStatus>('idle');
    const username = ref('');
    const presence = ref<IChatPresenceUpdatedEvent | undefined>(undefined);
    const joined = ref<IChatJoinedEvent | undefined>(undefined);
    const entries = ref<IRealtimeChatEntry[]>([]);
    const lastError = ref<string | undefined>(undefined);

    const setStatus = (nextStatus: IRealtimeConnectionStatus) => {
        status.value = nextStatus;
    };

    const setUsername = (nextUsername: string) => {
        username.value = nextUsername;
    };

    const setPresence = (payload: IChatPresenceUpdatedEvent) => {
        presence.value = payload;
    };

    const setJoined = (payload: IChatJoinedEvent) => {
        joined.value = payload;
    };

    const addEntry = (entry: IRealtimeChatEntry) => {
        entries.value = [...entries.value, entry].slice(-100);
    };

    const setError = (error: string) => {
        lastError.value = error;
    };

    return {
        status,
        username,
        presence,
        joined,
        entries,
        lastError,
        setStatus,
        setUsername,
        setPresence,
        setJoined,
        addEntry,
        setError
    };
});
