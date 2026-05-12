import type { ZodSafeParseError } from 'zod';
import type { IResponseReject } from '@/types';
import { i18n } from '@/utils/i18n.ts';

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

const getErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const { status } = error as { status?: unknown };
    return typeof status === 'number' ? status : undefined;
};

const hasTranslationKey = (key: string): boolean => {
    const locale = i18n.global.locale.value;
    let current: unknown = i18n.global.getLocaleMessage(locale);
    for (const part of key.split('.')) {
        if (!current || typeof current !== 'object' || !(part in current)) return false;
        current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string';
};

const getStatusMessage = (status: number): string | undefined => {
    if (status === 401) {
        if (!hasTranslationKey('navigation.error-not-logged')) return 'Authentication required';
        return i18n.global.t('navigation.error-not-logged');
    }
    if (status === 403) {
        if (!hasTranslationKey('navigation.error-forbidden')) return 'Forbidden';
        return i18n.global.t('navigation.error-forbidden');
    }
    return undefined;
};

export const getErrorMessages = (error: unknown): string[] => {
    if (isResponseReject(error)) {
        const statusMessage = getStatusMessage(error.status);
        if (statusMessage) return [statusMessage];
        return error.errors.length > 0 ? error.errors : [error.message];
    }
    const statusMessage = getStatusMessage(getErrorStatus(error) ?? 0);
    if (statusMessage) return [statusMessage];
    if (error instanceof Error && error.message) return [error.message];
    return ['Unknown error'];
};

export const notifyErrorMessages = (
    addMessage: (message: string) => unknown,
    error: unknown
): void => {
    for (const message of getErrorMessages(error)) addMessage(message);
};
