/**
 * @module
 * How a rules file becomes a committed `as const` TypeScript file: the spec a rule declares.
 * Read by `generate-shared-rules.ts`, never at runtime. Same shapes as the backend's generator,
 * so a rules file written for one side reads the same on the other.
 *
 * See: docs/tools/shared-rules.md
 */

/**
 * How one top-level field of a rules document is written out.
 *
 * - `verbatim`: the parsed data, dumped as an `as const` literal.
 * - `keyed-list`: a list of `{ value, description }` becomes `{ KEY: 'value' }`, one JSDoc per key.
 */
export type GenerateShape = 'verbatim' | 'keyed-list';

/** One exported constant in a generated file. */
export interface GeneratedExport {
    /** The constant's name. */
    exportName: string;
    /** How the data is written. */
    shape: GenerateShape;
    /** The top-level field it comes from; the whole document when absent. */
    field?: string;
    /** The constant's docblock. */
    description: string;
}

/** What a rules file generates. */
export interface GenerateSpec {
    /** Repo-relative path of the committed `.generated.ts`. */
    out: string;
    /** The constants it holds, in order. */
    exports: readonly GeneratedExport[];
}

/** One entry of a `keyed-list`. */
export interface KeyedEntry {
    /** The wire string; the constant's key is derived from it. */
    value: string;
    /** The key's docblock. */
    description: string;
}
