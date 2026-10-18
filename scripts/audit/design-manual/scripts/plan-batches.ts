/**
 * @module
 * Splits a capture into batches small enough for one reviewer's context.
 *
 * Pure. The CLI that reads and writes the files is `plan.ts`, kept apart the way the backend's
 * `generate-shallow-candidates.ts` keeps its entry point apart.
 */
import type { DesignCaptureManifest, DesignShot } from './manifest';

/**
 * The most image tokens one batch holds. 60k of pictures plus about 40k of source leaves room in
 * a 200k context for the reviewer's reasoning (current models have 1M; 200k is the floor that
 * keeps any sub-agent safe). The first full run measures and may retune it.
 */
export const BATCH_IMAGE_TOKENS = 60_000;

/**
 * The most tiles one batch holds: a reviewer that opens 20 images has seen enough.
 */
export const BATCH_TILES = 20;

/**
 * The two ceilings of a batch.
 */
export interface BatchBudget {
    /** The most image tokens a batch holds. */
    imageTokens: number;
    /** The most tiles a batch holds. */
    tiles: number;
}

/** The budget a real run uses. */
const DEFAULT_BUDGET: BatchBudget = { imageTokens: BATCH_IMAGE_TOKENS, tiles: BATCH_TILES };

/**
 * One reviewer's share of the capture.
 */
export interface Batch {
    /** `<module>`, or `<module>-<n>` when the module needed several batches. */
    name: string;
    /** The module every shot of the batch belongs to. */
    module: string;
    /** Ids of the shots, in run order. */
    shotIds: string[];
    /** How many tiles the shots hold. */
    tileCount: number;
    /** The sum of the tiles' estimated tokens. */
    estimatedTokens: number;
}

/**
 * The planner's answer: the batches, or the reason there are none.
 */
export interface BatchPlan {
    /** One per reviewer. Empty exactly when `problem` is set. */
    batches: Batch[];
    /** Why nothing was planned. Never absent for an empty plan: an empty capture must not pass quietly. */
    problem?: string;
}

/**
 * The shots of one case (one spec case at every size and theme): they stay in one batch so the
 * reviewer sees the same screen at phone and desktop side by side.
 */
interface CaseGroup {
    module: string;
    shots: DesignShot[];
    tileCount: number;
    estimatedTokens: number;
}

/**
 * Groups shots by module, then by case, both in run order.
 */
const groupByCase = (shots: DesignShot[]): CaseGroup[] => {
    const groups = new Map<string, CaseGroup>();

    for (const shot of shots) {
        const key = `${shot.module}\u0000${shot.spec}\u0000${shot.caseName}`;
        const group = groups.get(key) ?? {
            module: shot.module,
            shots: [],
            tileCount: 0,
            estimatedTokens: 0
        };
        group.shots.push(shot);
        group.tileCount += shot.tiles.length;
        group.estimatedTokens += shot.tiles.reduce((sum, tile) => sum + tile.estimatedTokens, 0);
        groups.set(key, group);
    }

    return [...groups.values()];
};

/**
 * Plans the batches of a manifest. One module is split once the next case would pass a budget; a
 * single case larger than a budget still gets a batch of its own, never split.
 */
export const planBatches = (
    manifest: Pick<DesignCaptureManifest, 'shots'>,
    budget: BatchBudget = DEFAULT_BUDGET
): BatchPlan => {
    if (manifest.shots.length === 0)
        return { batches: [], problem: 'the manifest holds no shots: nothing was captured' };

    const open = new Map<string, Batch[]>();

    for (const group of groupByCase(manifest.shots)) {
        const batches = open.get(group.module) ?? [];
        let batch = batches.at(-1);
        const fits =
            batch !== undefined &&
            batch.estimatedTokens + group.estimatedTokens <= budget.imageTokens &&
            batch.tileCount + group.tileCount <= budget.tiles;

        if (batch === undefined || !fits) {
            batch = {
                name: group.module,
                module: group.module,
                shotIds: [],
                tileCount: 0,
                estimatedTokens: 0
            };
            batches.push(batch);
        }
        batch.shotIds.push(...group.shots.map((shot) => shot.id));
        batch.tileCount += group.tileCount;
        batch.estimatedTokens += group.estimatedTokens;
        open.set(group.module, batches);
    }

    const planned = [...open.values()].flatMap((batches) =>
        batches.length === 1
            ? batches
            : batches.map((batch, index) => ({
                  ...batch,
                  name: `${batch.module}-${String(index + 1)}`
              }))
    );
    return { batches: planned };
};
