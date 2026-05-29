import type {
    IChatErrorEvent,
    IChatJoinedEvent,
    IChatMessageNewEvent,
    IChatMessageSendCommand,
    IChatPresenceUpdatedEvent,
    IChatJoinCommand,
    IChatSystemUserJoinedEvent,
    IChatSystemUserLeftEvent,
    IMetricsSnapshotEvent,
    IMetricsUpdatedEvent,
    IHeartbeatEvent
} from './realtime.generated';

export const REALTIME_SSE_EVENT_NAMES = [
    'observability.metrics.snapshot',
    'observability.metrics.updated',
    'observability.heartbeat'
] as const;

export const REALTIME_CHAT_EVENT_NAMES = [
    'realtime.chat.event.user.joined',
    'realtime.chat.event.user.left',
    'realtime.chat.event.message.new',
    'realtime.chat.event.presence.updated',
    'realtime.chat.event.joined',
    'realtime.chat.event.error'
] as const;

export type ISseEventName = (typeof REALTIME_SSE_EVENT_NAMES)[number];

export type IChatEventName = (typeof REALTIME_CHAT_EVENT_NAMES)[number];

export type ISseEventPayload<TEventName extends ISseEventName> =
    TEventName extends 'observability.metrics.snapshot'
        ? IMetricsSnapshotEvent
        : TEventName extends 'observability.metrics.updated'
          ? IMetricsUpdatedEvent
          : IHeartbeatEvent;

export type IChatEventPayload<TEventName extends IChatEventName> =
    TEventName extends 'realtime.chat.event.user.joined'
        ? IChatSystemUserJoinedEvent
        : TEventName extends 'realtime.chat.event.user.left'
          ? IChatSystemUserLeftEvent
          : TEventName extends 'realtime.chat.event.message.new'
            ? IChatMessageNewEvent
            : TEventName extends 'realtime.chat.event.presence.updated'
              ? IChatPresenceUpdatedEvent
              : TEventName extends 'realtime.chat.event.joined'
                ? IChatJoinedEvent
                : IChatErrorEvent;

export type IChatCommand = IChatJoinCommand | IChatMessageSendCommand;

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
