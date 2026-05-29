import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

/*
 * Read AsyncAPI from repository root and emit generated realtime types under src/types.
 */
const rootPath = path.resolve(import.meta.dirname, '..');
const contractPath = path.resolve(rootPath, 'asyncapi.yaml');
const outputPath = path.resolve(rootPath, 'src/types/realtime.generated.ts');

const asyncapiRaw = await readFile(contractPath, 'utf8');
const asyncapiDocument = parse(asyncapiRaw);

const schemas = asyncapiDocument?.components?.schemas ?? {};
const messages = asyncapiDocument?.components?.messages ?? {};
const channels = asyncapiDocument?.channels ?? {};

const formatPropertyKey = (property) =>
    /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(property) ? property : `'${property}'`;

const toPascalCase = (value) =>
    value
        .replaceAll(/[^A-Za-z0-9]+/gu, ' ')
        .trim()
        .split(/\s+/u)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join('');

const refToTypeName = (ref) => `I${ref.split('/').pop()}`;

const schemaToType = (schema, depth = 0) => {
    const indentation = '    '.repeat(depth);
    const childIndentation = '    '.repeat(depth + 1);

    if (schema === null || schema === undefined) return 'unknown';
    if (schema.$ref) return refToTypeName(schema.$ref);

    if (Array.isArray(schema.oneOf))
        return schema.oneOf.map((option) => schemaToType(option, depth)).join(' | ');

    if (Array.isArray(schema.anyOf))
        return schema.anyOf.map((option) => schemaToType(option, depth)).join(' | ');

    if (Array.isArray(schema.allOf))
        return schema.allOf.map((option) => schemaToType(option, depth)).join(' & ');

    if (Array.isArray(schema.enum) && schema.enum.length > 0)
        return schema.enum.map((value) => JSON.stringify(value)).join(' | ');

    if (schema.type === 'array') {
        const arrayItemType = schemaToType(schema.items, depth);
        return `(${arrayItemType})[]`;
    }

    if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
        const requiredProperties = schema.required ? new Set(schema.required) : undefined;
        const properties = Object.entries(schema.properties ?? {}).map(([propertyName, propertySchema]) => {
            const key = formatPropertyKey(propertyName);
            const optional = requiredProperties?.has(propertyName) ? '' : '?';
            const valueType = schemaToType(propertySchema, depth + 1);
            return `${childIndentation}${key}${optional}: ${valueType};`;
        });

        if (
            schema.additionalProperties &&
            typeof schema.additionalProperties === 'object' &&
            !Array.isArray(schema.additionalProperties)
        ) {
            properties.push(
                `${childIndentation}[key: string]: ${schemaToType(schema.additionalProperties, depth + 1)};`
            );
        }

        if ((schema.additionalProperties === true || schema.additionalProperties === undefined) && properties.length === 0)
            return 'Record<string, unknown>';

        return `{\n${properties.join('\n')}\n${indentation}}`;
    }

    if (schema.type === 'integer' || schema.type === 'number') return 'number';
    if (schema.type === 'boolean') return 'boolean';
    if (schema.type === 'string') return 'string';

    return 'unknown';
};

const schemaTypeBlocks = Object.entries(schemas).map(([schemaName, schema]) => {
    const typeName = `I${schemaName}`;
    return `export type ${typeName} = ${schemaToType(schema, 0)};`;
});

const messageTypeBlocks = Object.entries(messages).map(([messageName, message]) => {
    const typeName = `I${messageName}`;
    return `export type ${typeName} = ${schemaToType(message.payload, 0)};`;
});

const realtimeChannels = Object.keys(channels).filter(
    (channel) => channel.startsWith('realtime.') || channel.startsWith('observability.')
);

const realtimeChannelUnion =
    realtimeChannels.length > 0
        ? realtimeChannels.map((channel) => JSON.stringify(channel)).join(' | ')
        : 'never';

const generatedSource = `/*
 * This file is auto-generated from asyncapi.yaml.
 * Run \`npm run genasyncapi\` after AsyncAPI contract changes.
 */

${schemaTypeBlocks.join('\n\n')}

${messageTypeBlocks.join('\n\n')}

export type IRealtimeChannelName = ${realtimeChannelUnion};
`;

await writeFile(outputPath, generatedSource, 'utf8');
