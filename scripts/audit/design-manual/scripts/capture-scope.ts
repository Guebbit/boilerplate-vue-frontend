/**
 * @module
 * Turns the scope a person typed into the list of sweep specs the capture runs.
 *
 * Why:  the capture reuses the module accessibility sweeps (they already hold every route, role
 *       and `prepare` step), so a scope is only a choice of which of those specs to run.
 * Pure: the file system and git are passed in, so a spec can stand in for both.
 */
import { moduleOfSpec } from './capture-matrix';

/**
 * The shell's own sweep, the one outside every module.
 */
export const SHELL_SPEC = 'tests/e2e/specs/a11y.cy.ts';

/**
 * Paths whose change touches every screen, so a `--diff` scope widens to the whole app.
 */
export const SHARED_PREFIXES = ['src/app/', 'src/ui/', 'src/styles/'] as const;

/**
 * What {@link scopeToSpecs} needs from the outside world.
 */
export interface ScopeInput {
    /** The argument: empty (everything), `shell`, a module, a path, or `--diff`. */
    scope: string;
    /** Every module that has an accessibility sweep. */
    modules: readonly string[];
    /** Whether a repo-relative file exists: `actions.cy.ts` is optional. */
    exists: (file: string) => boolean;
    /** The files the working tree touches, for `--diff`. */
    changedFiles?: readonly string[];
}

/**
 * The specs to run and whether the scope had to widen.
 */
export interface ScopeResult {
    /** Repo-relative spec paths, in a stable order. */
    specs: string[];
    /** A `--diff` scope reached a shared path and ran everything. */
    widened: boolean;
}

/**
 * The sweep specs of one module: its accessibility sweep, plus its action specs once it has them.
 *
 * @param module - a module name, or `shell`
 * @param exists - whether a repo-relative file exists
 */
export const specsOfModule = (module: string, exists: (file: string) => boolean): string[] => {
    const folder = module === 'shell' ? 'tests/e2e/specs' : `src/modules/${module}/tests/e2e`;
    const sweep = module === 'shell' ? SHELL_SPEC : `${folder}/a11y.cy.ts`;
    const actions = `${folder}/actions.cy.ts`;
    return [sweep, ...(exists(actions) ? [actions] : [])];
};

/**
 * Resolves a scope to specs.
 *
 * - empty: the shell and every module,
 * - `shell` or a module name: that one,
 * - a path: the module that owns it,
 * - `--diff`: the modules the working tree touches; a change under `src/app/`, `src/ui/` or
 *   `src/styles/` touches every screen, so it widens to everything.
 *
 * @throws {RangeError} when the scope names nothing, or a `--diff` touches no module
 */
export const scopeToSpecs = (input: ScopeInput): ScopeResult => {
    const { scope, modules, exists, changedFiles = [] } = input;
    const everything = ['shell', ...modules];
    const collect = (names: readonly string[], widened: boolean): ScopeResult => ({
        specs: names.flatMap((name) => specsOfModule(name, exists)),
        widened
    });

    if (scope === '') return collect(everything, false);

    if (scope === '--diff') {
        if (changedFiles.some((file) => SHARED_PREFIXES.some((prefix) => file.startsWith(prefix))))
            return collect(everything, true);
        const touched = [
            ...new Set(
                changedFiles
                    .filter((file) => file.startsWith('src/modules/'))
                    .map((file) => moduleOfSpec(file))
                    .filter((name) => modules.includes(name))
            )
        ];
        if (touched.length === 0)
            throw new RangeError('the working tree touches no module with a sweep');
        return collect(touched, false);
    }

    if (scope === 'shell' || modules.includes(scope)) return collect([scope], false);

    const owner = moduleOfSpec(scope);
    if (scope.includes('/') && modules.includes(owner)) return collect([owner], false);
    if (scope.includes('/') && owner === 'shell') return collect(['shell'], false);

    throw new RangeError(`"${scope}" is not a module, "shell", a path or --diff`);
};
