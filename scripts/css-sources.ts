/**
 * @module
 * The app's CSS, collected for the stylesheet specs and the CSS audit.
 *
 * Three places hold CSS: `src/styles/main.css`, every SFC `<style>` block under `src/` (test
 * folders excluded), and the splash `<style>` in `index.html`. Each source keeps the line its CSS
 * starts on, so a PostCSS node line maps back to a line of the real file.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { AtRule, Node } from 'postcss';
import { parse as parseSfc } from 'vue/compiler-sfc';

/** The repo root (specs and scripts run from it). */
export const ROOT = process.cwd();

/** The Tailwind entry stylesheet, the one global stylesheet of the app. */
export const MAIN_CSS = 'src/styles/main.css';

/**
 * One piece of CSS and where it came from.
 */
export interface CssSource {
    /** The file, relative to the repo root. */
    file: string;
    /** The CSS text. */
    css: string;
    /** The file line the CSS text's first line sits on. */
    firstLine: number;
    /** Whether it is an SFC `<style scoped>` block. */
    scoped: boolean;
    /** Whether it is an SFC `<style>` block (scoped or not). */
    sfc: boolean;
}

/**
 * Every `.vue` file under a directory, test folders excluded, relative to the repo root.
 *
 * @param directory - The directory to walk, relative to the repo root.
 * @returns The SFC paths, in directory order.
 */
export const vueFiles = (directory = 'src'): string[] =>
    readdirSync(path.resolve(ROOT, directory), { withFileTypes: true }).flatMap((entry) => {
        const relative = path.join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === 'tests' ? [] : vueFiles(relative);
        return entry.name.endsWith('.vue') ? [relative] : [];
    });

/**
 * Reads a file at the repo root.
 *
 * @param file - The path, relative to the repo root.
 * @returns The file's text.
 */
export const readRoot = (file: string): string => readFileSync(path.resolve(ROOT, file), 'utf8');

/**
 * The `<style>` blocks of one SFC, each tagged with its first line.
 *
 * @param file - The SFC, relative to the repo root.
 * @returns One source per style block.
 */
const sfcStyles = (file: string): CssSource[] =>
    parseSfc(readRoot(file), { filename: file }).descriptor.styles.map((style) => ({
        file,
        css: style.content,
        firstLine: style.loc.start.line,
        scoped: style.scoped === true,
        sfc: true
    }));

/**
 * `main.css` and the body of every SFC `<style>` block — the CSS the app ships with.
 *
 * @returns `main.css` first, then the SFC blocks.
 */
export const cssSources = (): CssSource[] => [
    { file: MAIN_CSS, css: readRoot(MAIN_CSS), firstLine: 1, scoped: false, sfc: false },
    ...vueFiles().flatMap((file) => sfcStyles(file))
];

/**
 * The inline `<style>` blocks of `index.html` (the splash shown before the app boots).
 *
 * @returns One source per block.
 */
export const documentCssSources = (): CssSource[] => {
    const html = readRoot('index.html');
    return [...html.matchAll(/(<style[^>]*>)([\S\s]*?)<\/style>/g)].map((match) => ({
        file: 'index.html',
        css: match[2],
        firstLine: html.slice(0, match.index).split('\n').length,
        scoped: false,
        sfc: false
    }));
};

/**
 * Whether a node sits inside an `@theme` block (plain or `inline`).
 *
 * @param node - Any PostCSS node.
 * @returns `true` inside `@theme`.
 */
export const insideTheme = (node: Node | undefined): boolean => {
    if (node === undefined) return false;
    // `type === 'atrule'` is what makes the node an AtRule; PostCSS types `parent` more widely.
    if (node.type === 'atrule' && (node as AtRule).name === 'theme') return true;
    return insideTheme(node.parent);
};
