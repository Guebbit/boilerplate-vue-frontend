export interface IRealtimeChatEntry {
    id: string;
    kind: 'message' | 'system' | 'error';
    text: string;
    timestamp: string;
    username?: string;
}

export type IRealtimeConnectionStatus =
    | 'idle'
    | 'connecting'
    | 'open'
    | 'closed'
    | 'error';
