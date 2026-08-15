export interface ResponseNeutral {
    success: boolean;
    status: number;
    message: string;
}

export interface ResponseSuccess<T> extends ResponseNeutral {
    // message: "ok"
    data?: T;
    errors: never;
}

export interface ResponseReject extends ResponseNeutral {
    // message: Technical error name or code
    data?: never;
    // UI friendly error message
    errors: string[];
    // Backend correlation identifiers — useful for support/debugging
    requestId?: string;
    traceId?: string;
}