/**
 * @module
 * The manifest of one design capture: what was shot, from which commit, at which sizes.
 *
 * Written by the capture (Cypress' Node tasks), read by the batch planner and the citation check.
 * Pure types plus the one merge the parts of a run need.
 */
import type { ViewportName } from '../../../e2e/viewports';

/**
 * Where a capture run writes: the tiles, `manifest.json` and `batches.json`. Gitignored with
 * the rest of `reports/`, so a capture is disposable.
 */
export const CAPTURE_DIR = 'reports/audit/design-manual/capture';

/**
 * Where the review writes its findings, verified findings and final report.
 */
export const REPORT_DIR = 'reports/audit/design-manual';

/**
 * What a form control asks the phone keyboard for.
 */
export interface InputFact {
    /** The visible label text. */
    label: string;
    /** The `type` attribute. */
    type: string;
    /** The `inputmode` attribute, or null. */
    inputmode: string | null;
    /** The `autocomplete` attribute, or null. */
    autocomplete: string | null;
    /** The `enterkeyhint` attribute, or null. */
    enterkeyhint: string | null;
}

/**
 * What `page` records about one stitched page.
 */
export interface PageGeometry {
    /** Stitched height, px. */
    height: number;
    /** `scrollWidth` of the scroll target. */
    scrollWidth: number;
    /** `clientWidth` of the scroll target. */
    clientWidth: number;
    /** Fixed band cut from every segment but the first. */
    bandTop: number;
    /** Fixed band cut from every segment but the last. */
    bandBottom: number;
    /** A sticky in-flow element repeats across segments: not a duplicated element. */
    stickyRepeats: boolean;
}

/**
 * One readable slice of a stitched page.
 */
export interface DesignTile {
    /** Repo-relative PNG path. */
    path: string;
    /** Pixel width. */
    width: number;
    /** Pixel height. */
    height: number;
    /** Where the tile starts on the stitched page, px. */
    offsetY: number;
    /** w×h/750: Anthropic's own estimate, for the planner. */
    estimatedTokens: number;
}

/**
 * One screen, in one state, at one size and theme.
 */
export interface DesignShot {
    /** Stable slug: `<module>--<case>--<viewport>--<theme>[--<locale>]`. */
    id: string;
    /** `shell` or the module name: the batch key, and the row to look up in `docs/theory/sitemap.md`. */
    module: string;
    /** Repo-relative spec that declared the case. */
    spec: string;
    /** The case's `name`. */
    caseName: string;
    /** The path actually visited, ids resolved. */
    route: string;
    /** Who was signed in: `anonymous` or an e2e persona name (`E2ERole`). */
    role: string;
    /** Which viewport. */
    viewport: ViewportName;
    /** `[width, height]` in CSS px. */
    size: readonly [width: number, height: number];
    /** Whether touch emulation was on. */
    touch: boolean;
    /** The active Vuetify theme, asserted before the shot. */
    theme: 'light' | 'dark';
    /** The locale prefix visited. */
    locale: string;
    /** How the state was reached. */
    state: 'first-paint' | 'prepared' | 'loading' | 'error' | 'empty';
    /** The stitched page, cut into model-sized tiles, top to bottom. */
    tiles: DesignTile[];
    /** Page geometry, measured. */
    page: PageGeometry;
    /** Fixed elements that are not bands (toasts, a FAB): shown in the first segment only. */
    fixed: { selector: string; top: number; height: number }[];
    /** Form controls on screen, for the form-ergonomics item. */
    inputs: InputFact[];
    /** The h1–h3 outline, in document order. */
    headings: { level: 1 | 2 | 3; text: string }[];
}

/**
 * One capture run: what was shot, from which commit, at which sizes.
 */
export interface DesignCaptureManifest {
    /** Schema version; bumped when a field changes meaning. */
    version: 1;
    /** `git rev-parse HEAD` when the run started. */
    gitHead: string;
    /** Paths `git status --porcelain` listed when the run started: a dirty capture says so. */
    dirty: string[];
    /** ISO instant the run started. */
    capturedAt: string;
    /** The scope argument the run was started with; empty means the whole app. */
    scope: string;
    /** The viewport table the run used, copied from `scripts/e2e/viewports.ts`. */
    viewports: Partial<Record<ViewportName, { width: number; height: number; touch: boolean }>>;
    /** Files behind the chrome every screen shares (layout, app bar, drawer). */
    chromeSources: string[];
    /** Every shot, in run order. */
    shots: DesignShot[];
}

/**
 * Joins the manifests the specs of one run wrote into the run's single manifest.
 *
 * The header (commit, instant, scope) comes from the first part. Viewports and chrome sources are
 * unions, shots keep run order.
 *
 * @throws {RangeError} when there is no part, or two parts hold a shot with the same id (two
 * cases collided on one slug, so one of them would silently overwrite the other)
 */
export const mergeManifests = (parts: DesignCaptureManifest[]): DesignCaptureManifest => {
    const first = parts.at(0);
    if (!first) throw new RangeError('nothing to merge: no manifest parts');

    const seen = new Set<string>();
    const shots = parts.flatMap((part) => part.shots);
    for (const { id } of shots) {
        if (seen.has(id)) throw new RangeError(`two shots share the id ${id}`);
        seen.add(id);
    }

    return {
        ...first,
        viewports: Object.fromEntries(parts.flatMap((part) => Object.entries(part.viewports))),
        chromeSources: [...new Set(parts.flatMap((part) => part.chromeSources))],
        shots
    };
};
