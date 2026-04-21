import type { ZodSafeParseError } from 'zod';
import type { IResponseReject } from '@/types';

/**
 * Zod error interpreter
 * @param parsedResult
 */
export type IInputError = [string, string];
export function zodErrorInterpreter(parsedResult: ZodSafeParseError<Record<string, unknown>>) {
    const issues: IInputError[] = [];
    for (const [field, data] of Object.entries(parsedResult.error.format()))
        // There can be 2 ways in which the error is formatted
        if (field === '_errors' && data && (data as string[]).length > 0)
            for (const i18n of data as string[]) issues.push([field, i18n]);
        else if (Object.hasOwnProperty.call(data, '_errors'))
            for (const i18n of (data as { _errors: string[] })._errors) issues.push([field, i18n]);
    return issues;
}

const isResponseReject = (error: unknown): error is IResponseReject =>
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    'errors' in error &&
    Array.isArray(error.errors);

export const getErrorMessages = (error: unknown): string[] => {
    if (isResponseReject(error)) return error.errors.length > 0 ? error.errors : [error.message];
    if (error instanceof Error && error.message) return [error.message];
    return ['Unknown error'];
};

export const notifyErrorMessages = (
    addMessage: (message: string) => unknown,
    error: unknown
): void => {
    for (const message of getErrorMessages(error)) addMessage(message);
};
