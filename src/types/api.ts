export interface IResponseNeutral {
    success: boolean;
    status: number;
    message: string;
}

export interface IResponseSuccess<T> extends IResponseNeutral {
    // message: "ok"
    data?: T;
    errors: never;
}

export interface IResponseReject extends IResponseNeutral {
    // message: Technical error name or code
    data?: never;
    // UI friendly error message
    errors: string[];
}

export interface IPagination<T>{
    page: number;
    total: number;
    totalPages: number;
    items: T;
}