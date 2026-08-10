#!/usr/bin/env tsx
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/*
 * Root folder containing domain features.
 */
const FEATURES_ROOT = path.resolve('src/features');

/*
 * Maximum allowed number of cross-feature dependencies per feature.
 */
const MAX_FEATURE_DEPENDENCIES = Number.parseInt(process.env.MAX_FEATURE_DEPENDENCIES ?? '4', 10);

/*
 * Deep-feature imports bypass public feature APIs and are forbidden.
 */
const DEEP_FEATURE_IMPORT_PATTERN = /^@\/features\/[^/]+\/.+/;

/*
 * All features currently present in the repository.
 */
const featureNames = readdirSync(FEATURES_ROOT)
    .filter((entryName) => statSync(path.join(FEATURES_ROOT, entryName)).isDirectory())
    .toSorted();

/*
 * Source files inspected for coupling signals.
 */
const featureSourceFiles = collectFeatureSourceFiles(FEATURES_ROOT);

/*
 * Per-feature unique cross-feature dependencies.
 */
const featureDependencyMap = new Map<string, Set<string>>(
    featureNames.map((featureName) => [featureName, new Set<string>()])
);

/*
 * Deep imports bypassing `@/features/<feature>` public entries.
 */
const deepImportViolations: Array<{ filePath: string; specifier: string }> = [];

for (const filePath of featureSourceFiles) {
    const sourceFeature = readFeatureNameFromPath(filePath);
    if (!sourceFeature) continue;

    const fileContent = readFileSync(filePath, 'utf8');
    for (const specifier of extractImportSpecifiers(fileContent)) {
        if (DEEP_FEATURE_IMPORT_PATTERN.test(specifier)) {
            deepImportViolations.push({ filePath, specifier });
        }

        const targetFeature = readTargetFeatureFromSpecifier(specifier, filePath);
        if (!targetFeature || targetFeature === sourceFeature) continue;
        featureDependencyMap.get(sourceFeature)?.add(targetFeature);
    }
}

printCouplingSummary(featureDependencyMap);

if (deepImportViolations.length > 0) {
    console.error('\n[architecture] Deep feature imports found (use "@/features/<feature>" only):');
    for (const violation of deepImportViolations)
        console.error(
            `  - ${path.relative(process.cwd(), violation.filePath)} -> ${violation.specifier}`
        );
    process.exit(1);
}

const overloadedFeatures = [...featureDependencyMap.entries()].filter(
    ([, dependencies]) => dependencies.size > MAX_FEATURE_DEPENDENCIES
);

if (overloadedFeatures.length > 0) {
    console.error(
        `\n[architecture] Feature coupling limit exceeded (max ${MAX_FEATURE_DEPENDENCIES}):`
    );
    for (const [featureName, dependencies] of overloadedFeatures)
        console.error(`  - ${featureName}: ${dependencies.size} (${[...dependencies].join(', ')})`);
    process.exit(1);
}

console.log(
    `\n[architecture] OK: no deep feature imports, coupling within max ${MAX_FEATURE_DEPENDENCIES}.`
);

/*
 * Recursively collect `.ts` and `.vue` files from the feature tree.
 *
 * @param directoryPath - Folder to scan.
 * @returns Absolute file paths.
 */
function collectFeatureSourceFiles(directoryPath: string): string[] {
    const sourceFiles: string[] = [];
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
        const entryPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            sourceFiles.push(...collectFeatureSourceFiles(entryPath));
            continue;
        }
        if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) sourceFiles.push(entryPath);
    }
    return sourceFiles;
}

/*
 * Extract import specifiers from static imports and dynamic `import(...)`.
 *
 * @param fileContent - Raw source file content.
 * @returns Collected module specifiers.
 */
function extractImportSpecifiers(fileContent: string): string[] {
    const importRegex = /(?:import[\s\S]*?\sfrom\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
    const specifiers: string[] = [];
    for (const match of fileContent.matchAll(importRegex)) {
        const [, specifier] = match;
        if (specifier) specifiers.push(specifier);
    }
    return specifiers;
}

/*
 * Read the current feature name from an absolute file path.
 *
 * @param filePath - Absolute source path.
 * @returns Feature name, or undefined when path is outside `src/features`.
 */
function readFeatureNameFromPath(filePath: string): string | undefined {
    const relativePath = path.relative(FEATURES_ROOT, filePath);
    if (relativePath.startsWith('..')) return undefined;
    const [featureName] = relativePath.split(path.sep);
    return featureName;
}

/*
 * Resolve a specifier to the referenced feature when it points to one.
 *
 * @param specifier - Import specifier text.
 * @param sourceFilePath - File performing the import.
 * @returns Target feature name, or undefined when specifier is not feature-scoped.
 */
function readTargetFeatureFromSpecifier(
    specifier: string,
    sourceFilePath: string
): string | undefined {
    if (specifier.startsWith('@/features/')) {
        const featureName = specifier.split('/')[2];
        return featureName;
    }

    if (!specifier.startsWith('.')) return undefined;

    const resolvedPath = path.resolve(path.dirname(sourceFilePath), specifier);
    const relativePath = path.relative(FEATURES_ROOT, resolvedPath);
    if (relativePath.startsWith('..')) return undefined;
    const [featureName] = relativePath.split(path.sep);
    return featureName;
}

/*
 * Print architecture coupling metrics for each feature.
 *
 * @param dependencyMap - Per-feature dependency set.
 * @returns Nothing.
 */
function printCouplingSummary(dependencyMap: Map<string, Set<string>>): void {
    console.log('[architecture] Feature coupling summary');
    for (const featureName of featureNames) {
        const dependencies = [...(dependencyMap.get(featureName) ?? new Set())].toSorted();
        const dependencyList = dependencies.length > 0 ? dependencies.join(', ') : 'none';
        console.log(`  - ${featureName}: ${dependencies.length} -> ${dependencyList}`);
    }
}
