/*
 * This file is auto-generated from asyncapi.yaml.
 * Run `npm run genasyncapi` after AsyncAPI contract changes.
 */

export type IChatSystemPayload = {
    type: "chat:system";
    payload: {
        message: string;
        room: "general";
        timestamp: string;
    };
};

export type IChatMessagePayload = {
    type: "chat:message";
    payload: {
        id: string;
        username: string;
        room: "general";
        message: string;
        timestamp: string;
    };
};

export type IChatPresencePayload = {
    type: "chat:presence";
    payload: {
        room: "general";
        users: (string)[];
    };
};

export type IObservabilityMetricsPayload = {
    timestamp: string;
    uptimeSeconds: number;
    memory: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
    http: {
        totalRequests: number;
        totalErrors: number;
    };
    realtime: {
        websocketConnections: number;
        sseClients: number;
    };
};

export type IEmailJobPayload = {
    request: {
        to: string;
        subject?: string;
        text?: string;
        html?: string;
    };
    from?: string;
    templateName: string;
    data: Record<string, unknown>;
};

export type IPdfJobPayload = {
    templatePath: string;
    templateData: Record<string, unknown>;
    outputPath: string;
};

export type ICacheTagsInvalidatedPayload = {
    tags: (string)[];
    origin: string;
    timestamp: string;
};

export type IChatJoinCommand = {
    type: "chat:join";
    payload: {
        username: string;
        room?: "general";
    };
};

export type IChatMessageSendCommand = {
    type: "chat:message:send";
    payload: {
        message: string;
    };
};

export type IChatSystemUserJoinedEvent = IChatSystemPayload;

export type IChatSystemUserLeftEvent = IChatSystemPayload;

export type IChatMessageNewEvent = IChatMessagePayload;

export type IChatPresenceUpdatedEvent = IChatPresencePayload;

export type IChatErrorEvent = {
    type: "chat:error";
    payload: {
        message: string;
    };
};

export type IChatJoinedEvent = {
    type: "chat:joined";
    payload: {
        username: string;
        room: "general";
    };
};

export type IMetricsSnapshotEvent = IObservabilityMetricsPayload;

export type IMetricsUpdatedEvent = IObservabilityMetricsPayload;

export type IHeartbeatEvent = IObservabilityMetricsPayload;

export type ICartCheckedOutEvent = {
    eventName: "ecommerce.cart.checked_out";
    eventId: string;
    occurredAt: string;
    cartId: string;
    userId: string;
    orderId: string;
    itemCount: number;
};

export type IEmailJobMessage = IEmailJobPayload;

export type IPdfJobMessage = IPdfJobPayload;

export type ICacheTagsInvalidatedMessage = ICacheTagsInvalidatedPayload;

export type IEmailJobConsumeMessage = IEmailJobPayload;

export type IPdfJobConsumeMessage = IPdfJobPayload;

export type ICacheTagsInvalidatedConsumeMessage = ICacheTagsInvalidatedPayload;

export type IRealtimeChannelName = "realtime.chat.command.join" | "realtime.chat.command.message.send" | "realtime.chat.event.user.joined" | "realtime.chat.event.user.left" | "realtime.chat.event.message.new" | "realtime.chat.event.presence.updated" | "realtime.chat.event.joined" | "realtime.chat.event.error" | "observability.metrics.snapshot" | "observability.metrics.updated" | "observability.heartbeat";
