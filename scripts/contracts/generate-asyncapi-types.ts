#!/usr/bin/env tsx
/*
 * Generates the TypeScript realtime contract types from `asyncapi.yaml`.
 *
 * SHARED SCRIPT — started byte-identical in both repos of the pair. NOT byte-identical any more:
 * this copy also emits an inlined-JSON-Schema map for `create-sse-client.ts`'s runtime SSE-frame
 * validation, which the backend copy has no use for and emits queue-payload Zod validators
 * instead. `--out` is a required argument rather than a hardcoded default, so the two repos are
 * also free to write it to different paths — this copy's caller points it at
 * `contracts/asyncapi.generated.ts`, next to the generated REST client; the backend's own caller
 * decides its own. What both copies still share is the input format and the
 * channel/message-naming machinery — keep a fix to either half in step across both copies by hand
 * until this generator gets its own shared package.
 * What differs at the INPUT is unchanged: the backend generates from the whole contract, this
 * repo from the public subset, so only the backend's output carries the queue payloads.
 *
 * From whichever document it is given it emits the payload interfaces, the message aliases, the
 * per-namespace channel constants and unions, the SSE event name/payload maps, and each SSE
 * payload's JSON Schema with every `$ref` inlined — what `create-sse-client.ts` hands to Zod's own
 * `fromJSONSchema` to validate a frame. An export a repo happens not to use is harmless —
 * tree-shaken there, type-only here.
 *
 * `--check` writes nothing and exits 1 on a mismatch: the gate that stops a repo shipping types
 * for a contract it no longer has.
 *
 * Usage: tsx scripts/contracts/generate-asyncapi-types.ts --out <path> [--check]
 *
 * See: docs/api/asyncapi-workflow.md#generated-typescript-types
 */
import { TypeScriptGenerator, typeScriptDefaultModelNameConstraints } from '@asyncapi/modelina';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

/** The slice of an AsyncAPI 3.0 channel this generator reads. */
interface AsyncApiChannel {
    /** 3.0: a channel declares its message(s) once, direction lives on the operations that bind to it. */
    messages?: Record<string, { $ref?: string }>;
    /**
     * Vendor extension: `sse` for a channel pushed over the observability dashboard's EventSource
     * connection. Read instead of the `observability.` name prefix, which a channel outside that
     * namespace could share without being SSE at all — the backend's fragment is what declares this,
     * this script only reads it.
     */
    'x-transport'?: string;
}

/** The slice of an AsyncAPI message this generator reads: only its payload schema. */
interface AsyncApiMessage {
    payload?: JsonSchema;
}

/** The JSON Schema keywords the contract's payloads use; anything else is ignored. */
interface JsonSchema {
    $ref?: string;
    type?: string;
    enum?: unknown[];
    oneOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    allOf?: JsonSchema[];
    required?: string[];
    properties?: Record<string, JsonSchema>;
    items?: JsonSchema;
    additionalProperties?: boolean | JsonSchema;
}

/** The slice of the bundled AsyncAPI document this generator reads. */
interface AsyncApiDocument {
    channels?: Record<string, AsyncApiChannel>;
    components?: {
        messages?: Record<string, AsyncApiMessage>;
        schemas?: Record<string, JsonSchema>;
    };
}

/** The repo root. `import.meta.url` rather than `__dirname`: this script runs as ESM. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The bundled root contract this generator reads — never a module fragment. */
const INPUT = path.resolve(ROOT, 'asyncapi.yaml');

/*
 * Reads the required `--out` argument.
 *
 * @returns Absolute path of the file to generate.
 */
const resolveOutputPath = (): string => {
    const flagIndex = process.argv.indexOf('--out');
    const value = flagIndex === -1 ? undefined : process.argv[flagIndex + 1];
    if (!value) {
        console.error('Missing required argument: --out <path>');
        process.exit(1);
    }
    return path.resolve(ROOT, value);
};

/** Absolute path of the file to generate, from `--out`. */
const OUTPUT = resolveOutputPath();

/** `--check` compares and reports; without it the file is written. */
const checkOnly = process.argv.includes('--check');

/*
 * Converts source names into `PascalCase`.
 *
 * @param value Source name from the AsyncAPI contract.
 * @returns Sanitized `PascalCase` identifier.
 */
const toPascalCase = (value: string): string =>
    value
        .replaceAll(/[^A-Za-z0-9]+/gu, ' ')
        .trim()
        .split(/\s+/u)
        .filter(Boolean)
        .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
        .join('');

/*
 * Resolves `#/components/...` refs to their generated type names.
 *
 * @param reference AsyncAPI `$ref` value.
 * @returns TypeScript type name for the referenced model.
 */
const refToTypeName = (reference: string): string => toPascalCase(reference.split('/').pop() ?? '');

/*
 * The real payload type a message carries — never the message's own alias name, which
 * `messageTypeBlocks` may have deduped away. Two things in this file need "what type does this
 * message resolve to" (the SSE payload map below, and the alias declarations themselves), and
 * both go through this so neither can name a type the other dropped.
 *
 * @param messageName Key into `components.messages`.
 * @param messages The document's message definitions.
 * @returns The resolved payload type name, or 'unknown' when the message is not declared.
 */
const resolveMessagePayloadType = (
    messageName: string,
    messages: Record<string, AsyncApiMessage>
): string => {
    /*
     * Asked as "is it declared", not as a nullish check on the value. `Record<string,
     * AsyncApiMessage>` promises a value for every key, so an index access — and any `?.` on what
     * comes back — reads as always-present to TypeScript, and `no-unnecessary-condition` fails the
     * build over the guard. The promise is false here: the caller passes whatever name a channel's
     * `$ref` ended in, and a document is free to leave that undeclared in `components.messages`.
     * This is what keeps the 'unknown' the signature documents from being a TypeError instead.
     */
    if (!Object.hasOwn(messages, messageName)) return 'unknown';
    const { payload } = messages[messageName];
    if (!payload?.$ref) return 'unknown';
    return refToTypeName(payload.$ref);
};

/*
 * Builds channel-to-message-type entries for the channels a predicate selects. Every channel here
 * declares exactly one message — direction (SSE push vs. queue publish/consume) lives on the
 * operations bound to the channel, not on which map this reads.
 *
 * @param channels AsyncAPI channels map.
 * @param messages AsyncAPI message definitions, resolved to their PAYLOAD type — never the
 *   message's own (possibly deduped-away) alias name.
 * @param select Which channels to include — data-driven (the channel's own declared transport),
 *   never a name prefix: a name is free to change without that meaning anything moved.
 * @returns Ordered entries containing channel names and referenced message type names.
 */
const collectChannelMessageEntries = (
    channels: Record<string, AsyncApiChannel>,
    messages: Record<string, AsyncApiMessage>,
    select: (channelName: string, channel: AsyncApiChannel) => boolean
): { channelName: string; messageType: string }[] =>
    Object.entries(channels)
        .filter(([channelName, channel]) => select(channelName, channel))
        .map(([channelName, channel]) => {
            const ref = Object.values(channel.messages ?? {})[0]?.$ref;
            const messageName = ref ? (ref.split('/').pop() ?? '') : '';
            return {
                channelName,
                messageType: messageName
                    ? resolveMessagePayloadType(messageName, messages)
                    : 'unknown'
            };
        })
        .toSorted((a, b) => a.channelName.localeCompare(b.channelName));

/*
 * A schema with every `#/components/schemas/...` reference replaced by its target, recursively —
 * the self-contained form a JSON Schema consumer needs once it no longer has the document.
 *
 * @param schema The schema to inline.
 * @param schemas The document's `components.schemas`.
 * @returns A copy carrying no `$ref`.
 */
const inlineReferences = (schema: unknown, schemas: Record<string, JsonSchema>): unknown => {
    if (Array.isArray(schema)) return schema.map((item) => inlineReferences(item, schemas));
    if (typeof schema !== 'object' || schema === null) return schema;

    const reference = (schema as JsonSchema).$ref;
    if (reference) {
        const name = reference.split('/').pop() ?? '';
        return Object.hasOwn(schemas, name) ? inlineReferences(schemas[name], schemas) : {};
    }
    return Object.fromEntries(
        Object.entries(schema).map(([key, value]) => [key, inlineReferences(value, schemas)])
    );
};

/*
 * Renders the event-name to inlined-payload-schema constant.
 *
 * @param exportName Exported constant name.
 * @param entries Event names and the message each channel carries.
 * @param messageDefinitions The document's `components.messages`.
 * @param schemas The document's `components.schemas`.
 * @returns TypeScript source for the schema map.
 */
const renderPayloadSchemas = (
    exportName: string,
    entries: { channelName: string; messageName: string }[],
    messageDefinitions: Record<string, AsyncApiMessage>,
    schemas: Record<string, JsonSchema>
): string => {
    const rows = entries
        .map(({ channelName, messageName }) => {
            const payload = Object.hasOwn(messageDefinitions, messageName)
                ? messageDefinitions[messageName].payload
                : undefined;
            return `    ${JSON.stringify(channelName)}: ${JSON.stringify(inlineReferences(payload ?? {}, schemas))},`;
        })
        .join('\n');
    // Typed loosely on purpose: `as const` would make every array `readonly`, which no JSON
    // Schema consumer's parameter type accepts. The event-name keys stay exact.
    return `export const ${exportName}: Record<SseEventName, Record<string, unknown>> = {\n${rows}\n};`;
};

/*
 * Renders a readonly literal string array declaration.
 *
 * @param exportName Exported constant name.
 * @param values Literal string values.
 * @returns TypeScript source for the readonly array export.
 */
const renderLiteralArray = (exportName: string, values: string[]): string => {
    const lines = values.map((value) => `    ${JSON.stringify(value)},`).join('\n');
    return `export const ${exportName} = [\n${lines}\n] as const;`;
};

/*
 * Renders a typed event-name to payload map interface.
 *
 * @param interfaceName Map interface name.
 * @param entries Channel/message entries.
 * @returns TypeScript source for the payload map interface.
 */
const renderPayloadMap = (
    interfaceName: string,
    entries: { channelName: string; messageType: string }[]
): string => {
    const rows = entries
        .map(
            ({ channelName, messageType }) => `    ${JSON.stringify(channelName)}: ${messageType};`
        )
        .join('\n');
    return `export interface ${interfaceName} {\n${rows}\n}`;
};

/*
 * Turns a channel name into the SCREAMING_SNAKE key used inside its namespace constant.
 * `observability.metrics.snapshot` under `observability.` becomes `METRICS_SNAPSHOT`.
 *
 * @param channelName Full channel name.
 * @param prefix Namespace prefix to strip.
 * @returns Constant object key.
 */
const toConstantKey = (channelName: string, prefix: string): string =>
    channelName
        .slice(prefix.length)
        .replaceAll(/[.\-_]+/gu, '_')
        .toUpperCase();

/*
 * Renders one namespace's channel-name constant object plus its union type.
 * Namespaces are discovered from the contract, so a new channel prefix generates its own
 * group with no change to this script.
 *
 * @param namespace First dot-segment of the channel names (e.g. `observability`).
 * @param channelNames Every channel in that namespace.
 * @returns TypeScript source for the constant object and its union type.
 */
const renderChannelNamespace = (namespace: string, channelNames: string[]): string => {
    const prefix = `${namespace}.`;
    const constantName = `${namespace.toUpperCase()}_CHANNELS`;
    const unionName = `${toPascalCase(namespace)}Channel`;
    const entries = channelNames
        .map((channelName) => `    ${toConstantKey(channelName, prefix)}: '${channelName}',`)
        .join('\n');

    return [
        `/* Channel names in the "${prefix}" namespace */`,
        `export const ${constantName} = {`,
        entries,
        '} as const;',
        '',
        `/* Union of every "${prefix}" channel name */`,
        `export type ${unionName} = (typeof ${constantName})[keyof typeof ${constantName}];`,
        ''
    ].join('\n');
};

/*
 * Groups channel names by their first dot-segment, preserving contract order.
 *
 * @param channelNames Every channel name in the contract.
 * @returns Namespace to channel-names map.
 */
const groupChannelsByNamespace = (channelNames: string[]): Map<string, string[]> => {
    const groups = new Map<string, string[]>();
    for (const channelName of channelNames) {
        const namespace = channelName.split('.')[0];
        if (!namespace) continue;
        groups.set(namespace, [...(groups.get(namespace) ?? []), channelName]);
    }
    return groups;
};

/**
 * Modelina's default TypeScript model-name rules (reserved words, illegal characters), with this
 * repo's `PascalCase` formatter swapped in as the naming step.
 * https://github.com/asyncapi/modelina/blob/master/docs/constraints.md
 */
const modelNameConstraints = typeScriptDefaultModelNameConstraints({
    NAMING_FORMATTER: (value: string) => toPascalCase(value)
});

/**
 * Modelina's TypeScript generator. `modelType: 'interface'` emits interfaces, not classes;
 * `enumType: 'union'` emits string-literal unions, not `enum`; `rawPropertyNames` keeps property
 * names exactly as the contract spells them.
 * https://github.com/asyncapi/modelina/blob/master/docs/languages/TypeScript.md
 */
const generator = new TypeScriptGenerator({
    modelType: 'interface',
    enumType: 'union',
    rawPropertyNames: true,
    constraints: {
        modelName: modelNameConstraints
    }
});

/** The bundled contract's raw text, handed to Modelina as-is. */
const specText = readFileSync(INPUT, 'utf8');

/**
 * The same text parsed. `parse` is the `yaml` package's YAML 1.2 loader; the `as` narrows its
 * `any` to the slice this file reads. https://eemeli.org/yaml/#yaml-parse
 */
const document = parse(specText) as AsyncApiDocument;

/** Every channel; none declared reads as empty. */
const channels = document.channels ?? {};

/** Every named message. */
const messages = document.components?.messages ?? {};

/** A channel is SSE because it declares so, never because its name happens to start a certain way. */
const isSseChannel = (_channelName: string, channel: AsyncApiChannel): boolean =>
    channel['x-transport'] === 'sse';

/** The messages carried by channels tagged `x-transport: sse`, for the SSE catalogue. */
const sseEntries = collectChannelMessageEntries(channels, messages, isSseChannel);

/*
 * The message each SSE channel carries, by name — what {@link renderPayloadSchemas} reads the
 * payload schema off.
 */
const sseMessageNames = Object.entries(channels)
    .filter(([channelName, channel]) => isSseChannel(channelName, channel))
    .map(([channelName, channel]) => ({
        channelName,
        messageName:
            Object.values(channel.messages ?? {})[0]
                ?.$ref?.split('/')
                .pop() ?? ''
    }))
    .toSorted((a, b) => a.channelName.localeCompare(b.channelName));

/** One generated `namespace` block per channel family (the dotted prefix of a channel name). */
const channelNamespaceBlocks = [...groupChannelsByNamespace(Object.keys(channels))].map(
    ([namespace, channelNames]) => renderChannelNamespace(namespace, channelNames)
);

/** One `export type Alias = Payload;` line per message whose name differs from its payload type. */
const messageTypeBlocks = Object.entries(messages)
    .map(([messageName]) => {
        const aliasName = toPascalCase(messageName);
        const targetName = resolveMessagePayloadType(messageName, messages);
        // Skip self-referential aliases (message name resolves to same type as schema)
        if (aliasName === targetName) return '';
        return `export type ${aliasName} = ${targetName};`;
    })
    .filter(Boolean);

/*
 * Builds the full generated file output content.
 *
 * @param modelBlocks Modelina-generated schema blocks.
 * @returns Complete TypeScript source for the generated types file.
 */
const buildOutput = (modelBlocks: string[]): string => {
    const sections = [
        '// Code generated by `npm run gen:asyncapi`. DO NOT EDIT.',
        '/* eslint-disable @typescript-eslint/naming-convention */',
        '/*',
        ' * GENERATED — do not edit manually.',
        ' * Source: asyncapi.yaml  |  Regenerate: npm run gen:asyncapi',
        ' */',
        '',
        ...modelBlocks,
        '',
        ...messageTypeBlocks,
        '',
        '/* Channel name constants (canonical identifiers from asyncapi.yaml) */',
        '',
        ...channelNamespaceBlocks,
        renderLiteralArray(
            'REALTIME_SSE_EVENT_NAMES',
            sseEntries.map(({ channelName }) => channelName)
        ),
        'export type SseEventName = (typeof REALTIME_SSE_EVENT_NAMES)[number];',
        renderPayloadMap('SseEventPayloadMap', sseEntries),
        'export type SseEventPayload<TEventName extends SseEventName> = SseEventPayloadMap[TEventName];',
        renderPayloadSchemas(
            'SSE_EVENT_PAYLOAD_SCHEMAS',
            sseMessageNames,
            messages,
            document.components?.schemas ?? {}
        ),
        ''
    ];

    return sections.join('\n');
};

/*
 * Generates contract models, then writes the realtime types file or asserts it is already current.
 */
generator
    .generate(specText)
    .then((models) => {
        const modelBlocks = models.map(
            (model) =>
                `export ${model.result.replaceAll('Map<string, any>', 'Record<string, unknown>')}`
        );
        const output = buildOutput(modelBlocks);

        if (!checkOnly) {
            writeFileSync(OUTPUT, output, 'utf8');
            console.log(`✓ Generated ${OUTPUT}`);
            return;
        }

        if (existsSync(OUTPUT) && readFileSync(OUTPUT, 'utf8') === output) {
            console.log(`✓ ${OUTPUT} is current with asyncapi.yaml`);
            return;
        }

        // Names the one command that fixes it: the file is an output, so there is nothing to decide.
        console.error(
            `${OUTPUT} is not what asyncapi.yaml generates.\n` +
                `  Run: npm run gen:asyncapi\n` +
                `  Then commit the result.`
        );
        process.exit(1);
    })
    .catch((error: unknown) => {
        console.error(error);
        process.exit(1);
    });
