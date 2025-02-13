import type { SafeParseError } from 'zod'

/**
 * Zod error interpreter
 * @param parsedResult
 */
export type IInputError = [string, string];

export function zodErrorInterpreter(parsedResult: SafeParseError<Record<string, unknown>>) {
    const issues: IInputError[] = []
    for (const [field, data] of Object.entries(parsedResult.error.format()))
        if (Object.hasOwnProperty.call(data, '_errors'))
            for (const i18n of (data as { _errors: string[] })._errors)
                issues.push([
                    field,
                    i18n
                ])
    return issues
}