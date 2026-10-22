#!/usr/bin/env tsx
/**
 * @module
 * Writes the `code-shape` audit's shallow candidates to `reports/audit/code-shape/shallow.json`.
 *
 * Usage: `npm run audit:shallow -- [path...]` — repo-relative prefixes, `src` by default.
 *
 * The program is the app's `.ts` plus the Vitest project's, and every `.vue` file's script block
 * as a virtual `<file>.vue.ts` source: line numbers are kept (everything outside the script is
 * blanked), an SFC import resolves to it, and a name the template uses counts as one use. Kept
 * apart from `./shallow-candidates.ts` so its unit test can import the counting without running this.
 */
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parse as parseSfc } from 'vue/compiler-sfc';

import { findShallowCandidates } from './shallow-candidates';

/** The repo root: the audit runs from it, like every script here. */
const ROOT = process.cwd();

/** Scanned when no path is given: the code that ships. */
const DEFAULT_SCOPE = ['src'];

/** Where the report lands — gitignored working evidence, like every audit report. */
const OUTPUT = path.join(ROOT, 'reports', 'audit', 'code-shape', 'shallow.json');

/**
 * One SFC as a TypeScript source: its script blocks where they were, blank lines elsewhere, and a
 * trailing `void [...]` naming every identifier the template mentions, so a function used only in
 * the template still has a use.
 *
 * @param text - The SFC source.
 * @param file - Its name, for the parser.
 * @returns The virtual TypeScript source.
 */
const scriptOf = (text: string, file: string): string => {
    const { descriptor } = parseSfc(text, { filename: file });
    const lines = text.split('\n').map(() => '');
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
        if (block === null) continue;
        block.content.split('\n').forEach((line, index) => {
            lines[block.loc.start.line - 1 + index] = line;
        });
    }
    const template = descriptor.template?.content ?? '';
    const names = [...new Set(template.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [])];
    return `${lines.join('\n')}\nvoid [${names.join(', ')}];\n`;
};

/** Every SFC under `src`, by absolute virtual file name (`….vue.ts`), with its script source. */
const virtualFiles = new Map(
    globSync('src/**/*.vue', { cwd: ROOT }).map((file) => [
        path.join(ROOT, `${file}.ts`),
        scriptOf(readFileSync(path.join(ROOT, file), 'utf8'), file)
    ])
);

/** Reads a tsconfig into compiler options and its `.ts` file list. */
const readConfig = (name: string): ts.ParsedCommandLine => {
    const raw: unknown = ts.readConfigFile(path.join(ROOT, name), (file) =>
        ts.sys.readFile(file)
    ).config;
    return ts.parseJsonConfigFileContent(raw, ts.sys, ROOT);
};

/** The app project, and the unit-test project whose uses of a helper still count. */
const app = readConfig('tsconfig.app.json');

/** Unit tests call helpers too. */
const tests = readConfig('tsconfig.vitest.json');

/** TypeScript: the default host, with `.vue` imports answered by the virtual sources. */
const host = ts.createCompilerHost(app.options);

/** The stock file reader, kept for everything that is not an SFC. */
const readFile = host.readFile.bind(host);

host.readFile = (fileName) => virtualFiles.get(fileName) ?? readFile(fileName);
host.fileExists = (fileName) => virtualFiles.has(fileName) || ts.sys.fileExists(fileName);
host.getSourceFile = (fileName, languageVersion) => {
    const text = host.readFile(fileName);
    return text === undefined
        ? undefined
        : ts.createSourceFile(fileName, text, languageVersion, true);
};

/**
 * TypeScript: resolves `./X.vue` and `@/x/X.vue` to the virtual `.vue.ts`, everything else as usual.
 * https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#customizing-module-resolution
 */
host.resolveModuleNameLiterals = (literals, containingFile, _redirect, options) =>
    literals.map((literal) => {
        const name = literal.text;
        const target = name.startsWith('@/')
            ? path.join(ROOT, 'src', name.slice(2))
            : path.resolve(path.dirname(containingFile), name);
        const virtual = `${target}.ts`;
        if (name.endsWith('.vue') && virtualFiles.has(virtual))
            return {
                resolvedModule: {
                    resolvedFileName: virtual,
                    extension: ts.Extension.Ts,
                    isExternalLibraryImport: false
                }
            };
        return {
            resolvedModule: ts.resolveModuleName(name, containingFile, options, ts.sys)
                .resolvedModule
        };
    });

/** TypeScript: the whole project as one program, so the checker can resolve every import. */
const program = ts.createProgram({
    rootNames: [...new Set([...app.fileNames, ...tests.fileNames, ...virtualFiles.keys()])],
    options: app.options,
    host
});

/** The scope asked for on the command line, or the default. */
const scope = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_SCOPE;

/** The candidate lists. */
const report = findShallowCandidates(program, ROOT, scope);

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify({ scope, ...report }, undefined, 2)}\n`);
console.log(
    `shallow candidates in ${scope.join(', ')}: ` +
        `smallAndRare ${String(report.smallAndRare.length)}, ` +
        `passThroughs ${String(report.passThroughs.length)}, ` +
        `optionalNeverPassed ${String(report.optionalNeverPassed.length)}, ` +
        `lazyFiles ${String(report.lazyFiles.length)}\n` +
        `→ ${path.relative(ROOT, OUTPUT)}`
);
