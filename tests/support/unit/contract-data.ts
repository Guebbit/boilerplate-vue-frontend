/**
 * @module
 * Zod-schema-driven payload generator for request bodies: fork of BE `tests/support/contract-data.ts`,
 * not kept in step. Pointed here at `contracts/rest/schemas.zod.ts` (Zod 4), and used by the form
 * property specs to ask "does this form accept every legal body, and refuse each one-field-broken one".
 *
 * Two entry points:
 *
 *   validPayload(schema)     - a payload that satisfies the schema
 *   invalidPayloads(schema)  - payloads that each violate exactly one constraint
 *
 * No lib:  an in-repo walker over Zod 4's own `_zod.def` introspection, because the generator
 *          libraries lag Zod majors.
 * Seeding: one Mulberry32 PRNG per process, seeded from `RANDOM_DATA_SEED` or a fresh value that
 *          is printed on first use, so a failing run can be reproduced.
 */
import { asStub } from '../stub.ts';
import { sampleForPattern } from './pattern-samples.ts';
import type { ZodType } from 'zod';

// ─── seeded PRNG ────────────────────────────────────────────────────────────────
//
// Mulberry32: small, fast, good statistical quality for test-data purposes (not
// cryptographic). Returns a function yielding floats in [0, 1), deterministic for a given seed.
const createRandom = (seed: number) => {
    let state = seed >>> 0;
    return (): number => {
        state = (state + 1_831_565_813) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
};

/** Whether this process has already picked its seed and printed it. */
let seeded = false;

/** The shared pseudo-random source; replaced once, by {@link ensureSeeded}. */
let random = createRandom(0);

/** `RANDOM_DATA_SEED` when set to a finite number, otherwise a fresh value. */
export const resolveContractDataSeed = (): number => {
    const raw = process.env.RANDOM_DATA_SEED;
    const parsed = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : Math.floor(Math.random() * 1e9);
};

/** Pick the seed on first use and print it, so a failing run can be reproduced. */
const ensureSeeded = (): void => {
    if (seeded) return;
    const seed = resolveContractDataSeed();
    random = createRandom(seed);
    seeded = true;
    // eslint-disable-next-line no-console -- the reproduction seed must reach the terminal even where the logger is mocked
    console.log(`[contract-data] seed=${seed} (rerun with RANDOM_DATA_SEED=${seed} to reproduce)`);
};

/** A whole number in `[min, max]`, both ends included. */
const randomInt = (min: number, max: number): number =>
    min + Math.floor(random() * (max - min + 1));

/** Characters {@link randomAlpha} draws from. */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/** Characters {@link randomHex} draws from. */
const HEX_ALPHABET = '0123456789abcdef';

/** `length` random lowercase letters. */
const randomAlpha = (length: number): string =>
    Array.from({ length }, () => ALPHABET[randomInt(0, ALPHABET.length - 1)]).join('');

/** `length` random hex digits. */
const randomHex = (length: number): string =>
    Array.from({ length }, () => HEX_ALPHABET[randomInt(0, HEX_ALPHABET.length - 1)]).join('');

/** A few short words joined together — long enough in practice to clear common hand-tightened
 * minimums (e.g. a username or title requiring at least a few characters) without hardcoding
 * any specific business rule the contract itself doesn't declare. */
const randomWords = (): string =>
    Array.from({ length: randomInt(3, 6) }, () => randomAlpha(randomInt(3, 8))).join(' ');

// ─── zod v4 introspection ───────────────────────────────────────────────────────

/** The slice of a Zod v4 check definition this generator reads. */
interface ZodCheckDefinition {
    check: string;
    minimum?: number;
    maximum?: number;
    value?: number;
    /** Present on `string_format` checks whose `format` is `regex` — i.e. OpenAPI `pattern`. */
    pattern?: RegExp;
}

/** The slice of a Zod v4 schema definition this generator reads; the rest is ignored. */
interface ZodDefinition {
    type: string;
    shape?: Record<string, ZodType>;
    element?: ZodType;
    innerType?: ZodType;
    valueType?: ZodType;
    format?: string;
    checks?: { _zod: { def: ZodCheckDefinition } }[];
    entries?: Record<string, unknown>;
    values?: unknown[];
    options?: ZodType[];
}

/** Zod keeps a schema's definition under the internal `_zod.def`; this is the one place that reaches it. */
const definitionOf = (schema: ZodType): ZodDefinition =>
    asStub<{ _zod: { def: ZodDefinition } }>(schema)._zod.def;

/** The checks (min length, pattern, ...) attached to a schema, unwrapped from Zod's wrapper. */
const checksOf = (definition: ZodDefinition): ZodCheckDefinition[] =>
    (definition.checks ?? []).map((check) => check._zod.def);

/**
 * Whether the field may be omitted from a payload entirely.
 *
 * `default` counts, which is why this is a function rather than a `===`. A field declared
 * `default:` in `openapi.yaml` becomes `zod.boolean().default(…)`, whose `_zod.def` type is
 * `'default'` and not `'optional'`. Treating it as required would make `invalidPayloads()` emit a
 * "missing required field" case asserting a 422 the API cannot give — omitting the field is
 * exactly what a default is for, so the request succeeds and the failure describes this
 * generator rather than the API.
 *
 * `nullable` deliberately does NOT count. A nullable field still has to be present; it may only
 * hold `null`. Folding it in here would silently drop real "missing required field" coverage.
 */
const isOptionalField = (schema: ZodType): boolean => {
    const { type } = definitionOf(schema);
    return type === 'optional' || type === 'default';
};

/** Unwraps optional/nullable/default wrappers to the schema whose constraints actually apply. */
const unwrapField = (schema: ZodType): ZodType => {
    const definition = definitionOf(schema);
    if (
        definition.type === 'optional' ||
        definition.type === 'nullable' ||
        definition.type === 'default'
    )
        return unwrapField(definition.innerType!);
    return schema;
};

/**
 * Shapes a valid email address can take, and that a hand-tightened validator most often gets
 * wrong: a plus-tag (RFC 5321 mailbox extension), an 8+ character TLD (`.photography`, not just
 * `.com`), and a subdomain. One is picked per call, same PRNG as everything else here.
 */
/** The address shapes the generator rotates through: plain, plus-tagged, long TLD, subdomain. */
const EMAIL_SHAPES: (() => string)[] = [
    () => `${randomAlpha(8)}@example.com`,
    () => `${randomAlpha(6)}+${randomAlpha(4)}@example.com`,
    () => `${randomAlpha(8)}@example.photography`,
    () => `${randomAlpha(8)}@mail.example.com`
];

/** A string matching the OpenAPI `format` (email, uuid, date-time, ...), or plain words. */
const randomStringForFormat = (format?: string): string => {
    switch (format) {
        case 'email': {
            return EMAIL_SHAPES[randomInt(0, EMAIL_SHAPES.length - 1)]();
        }
        case 'url': {
            return `https://example.com/${randomAlpha(8)}`;
        }
        case 'datetime': {
            return new Date().toISOString();
        }
        case 'uuid':
        case 'guid': {
            const hex = (length: number) => randomHex(length);
            // Version 4, variant 1 — matches the shape most `.uuid()`/`.guid()` validators check.
            return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
        }
        default: {
            return randomWords();
        }
    }
};

/**
 * Ensures `value` satisfies every `regex` check on the field, substituting a known-good sample
 * when it does not.
 *
 * REFUSES to return a value it knows is illegal. Ignoring a `pattern` would let `validPayload`
 * hand an endpoint a payload the contract forbids, and the resulting 422 would read as an
 * endpoint bug rather than a generator gap.
 * @throws {Error} when a pattern has no entry in `tests/support/unit/pattern-samples.ts`
 */
const satisfyPattern = (value: string, checks: ZodCheckDefinition[]): string => {
    let result = value;

    for (const check of checks) {
        const { pattern } = check;
        if (!pattern || pattern.test(result)) continue;

        const sample = sampleForPattern(pattern.source);
        if (sample === undefined)
            throw new Error(
                `contract-data: no sample value for pattern ${pattern.source}. ` +
                    'Add one to PATTERN_SAMPLES in tests/support/unit/pattern-samples.ts — without it ' +
                    'validPayload() would emit a value the contract declares illegal.'
            );

        result = sample;
    }

    return result;
};

/** Pad with `x` to the schema's minimum length, or cut to its maximum. */
const clampStringLength = (value: string, checks: ZodCheckDefinition[]): string => {
    const minLength = checks.find((check) => check.check === 'min_length')?.minimum;
    const maxLength = checks.find((check) => check.check === 'max_length')?.maximum;
    let result = value;
    if (typeof minLength === 'number' && result.length < minLength)
        result = result.padEnd(minLength, 'x');
    if (typeof maxLength === 'number' && result.length > maxLength)
        result = result.slice(0, maxLength);
    return result;
};

/** One valid value for `schema`, built from its Zod definition. */
const buildValue = (schema: ZodType): unknown => {
    const definition = definitionOf(schema);
    switch (definition.type) {
        case 'string': {
            const checks = checksOf(definition);
            // Pattern last: clamping a padded/truncated string could otherwise break it.
            return satisfyPattern(
                clampStringLength(randomStringForFormat(definition.format), checks),
                checks
            );
        }
        case 'number': {
            const checks = checksOf(definition);
            const min = checks.find((check) => check.check === 'greater_than')?.value;
            const max = checks.find((check) => check.check === 'less_than')?.value;
            const low = typeof min === 'number' ? min : 0;
            const high = typeof max === 'number' ? max : low + 1000;
            // Always a whole number: a valid `number`/`format: double` either way, but also
            // satisfies fields the OpenAPI spec declares `type: integer` — a constraint that
            // doesn't always survive into the generated zod schema as an explicit `.int()`
            // (e.g. CreateOrderBody's `items[].quantity` is `zod.number().min(1)` in
            // `api/schemas.zod.ts`, but `integer` in `openapi.yaml`).
            return Math.round(low + random() * (high - low));
        }
        case 'boolean': {
            return random() < 0.5;
        }
        case 'literal': {
            return (definition.values ?? [])[0];
        }
        // `type: 'null'` (OpenAPI 3.1) — the write-side `imageUrl`, whose one legal value is `null`.
        case 'null': {
            return null;
        }
        case 'enum': {
            const values = Object.values(definition.entries ?? {});
            return values[randomInt(0, values.length - 1)];
        }
        case 'array': {
            const minItems =
                checksOf(definition).find((check) => check.check === 'min_length')?.minimum ?? 1;
            const count = Math.max(minItems, 1);
            return Array.from({ length: count }, () => buildValue(definition.element!));
        }
        case 'object': {
            const result: Record<string, unknown> = {};
            for (const [key, fieldSchema] of Object.entries(definition.shape ?? {}))
                result[key] = buildValue(fieldSchema);
            return result;
        }
        case 'optional':
        case 'nullable':
        case 'default': {
            return buildValue(definition.innerType!);
        }
        case 'record': {
            return { [randomStringForFormat()]: buildValue(definition.valueType!) };
        }
        case 'union': {
            return buildValue((definition.options ?? [])[0]);
        }
        case 'unknown':
        case 'any': {
            return {};
        }
        default: {
            throw new Error(`contract-data: unsupported zod type "${definition.type}"`);
        }
    }
};

/**
 * Builds a payload that satisfies `schema` — every field, including optional ones, populated
 * with a contract-valid value.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the type parameter is the call site's cast: validPayload<CreateUserBody>(schema)
export const validPayload = <T = Record<string, unknown>>(schema: ZodType): T => {
    ensureSeeded();
    return buildValue(schema) as T;
};

/** One way to break a payload: which field, what rule, and the full broken body. */
export interface InvalidPayloadCase {
    field: string;
    violation: string;
    payload: Record<string, unknown>;
}

/** Values that break one field's rules (too short, wrong type, ...), each named. */
const violationsForField = (fieldSchema: ZodType): { violation: string; value: unknown }[] => {
    const definition = definitionOf(unwrapField(fieldSchema));
    const checks = checksOf(definition);
    const violations: { violation: string; value: unknown }[] = [];

    switch (definition.type) {
        case 'string': {
            const minLength = checks.find((check) => check.check === 'min_length')?.minimum;
            if (typeof minLength === 'number' && minLength > 0)
                violations.push({
                    violation: `shorter than the required minimum length (${minLength})`,
                    value: 'x'.repeat(Math.max(0, minLength - 1))
                });
            const maxLength = checks.find((check) => check.check === 'max_length')?.maximum;
            if (typeof maxLength === 'number')
                violations.push({
                    violation: `longer than the allowed maximum length (${maxLength})`,
                    value: 'x'.repeat(maxLength + 1)
                });
            if (definition.format === 'email')
                violations.push({ violation: 'not a valid email address', value: 'not-an-email' });
            if (definition.format === 'url')
                violations.push({ violation: 'not a valid URL', value: 'not a url' });

            break;
        }
        case 'number': {
            const min = checks.find((check) => check.check === 'greater_than');
            if (min && typeof min.value === 'number')
                violations.push({
                    violation: `below the minimum (${min.value})`,
                    value: min.value - 1
                });
            const max = checks.find((check) => check.check === 'less_than');
            if (max && typeof max.value === 'number')
                violations.push({
                    violation: `above the maximum (${max.value})`,
                    value: max.value + 1
                });
            violations.push({
                violation: 'wrong type (string instead of number)',
                value: 'not-a-number'
            });

            break;
        }
        case 'array': {
            const minItems = checks.find((check) => check.check === 'min_length');
            if (minItems && typeof minItems.minimum === 'number' && minItems.minimum > 0)
                violations.push({
                    violation: `fewer than the minimum item count (${minItems.minimum})`,
                    value: []
                });

            break;
        }
        case 'enum': {
            violations.push({
                violation: 'not one of the declared enum values',
                value: 'not-a-declared-enum-value'
            });

            break;
        }
        case 'boolean': {
            violations.push({
                violation: 'wrong type (string instead of boolean)',
                value: 'not-a-boolean'
            });

            break;
        }
        // No default
    }

    if (violations.length === 0)
        violations.push({
            violation: 'wrong type (number instead of the declared type)',
            value: 424_242
        });

    return violations;
};

/**
 * Builds one payload per constraint violated: each is otherwise `validPayload(schema)`, with
 * exactly one field mutated — missing (for a required field) or out of bounds / wrong format
 * (for a field carrying a min/max/format constraint). Object schemas are supported, and a union of
 * them (a tagged body, like `POST /account/reauth`'s) is walked branch by branch; every `*Body`
 * export in `api/schemas.zod.ts` is one of the two.
 */
export const invalidPayloads = (schema: ZodType): InvalidPayloadCase[] => {
    ensureSeeded();
    const definition = definitionOf(schema);
    if (definition.type === 'union')
        return (definition.options ?? []).flatMap((option) => invalidPayloads(option));
    if (definition.type !== 'object')
        throw new Error(`invalidPayloads: expected an object schema, got "${definition.type}"`);

    const basePayload = buildValue(schema) as Record<string, unknown>;
    const cases: InvalidPayloadCase[] = [];

    for (const [key, fieldSchema] of Object.entries(definition.shape ?? {})) {
        if (!isOptionalField(fieldSchema)) {
            const payload = { ...basePayload };
            delete payload[key];
            cases.push({ field: key, violation: 'missing required field', payload });
        }

        for (const { violation, value } of violationsForField(fieldSchema))
            cases.push({ field: key, violation, payload: { ...basePayload, [key]: value } });
    }

    return cases;
};
