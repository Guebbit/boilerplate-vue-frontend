/**
 * The pure half of `run-e2e-shards.ts`: the measured-duration table and the LPT (longest-
 * processing-time) bin-packing that assigns specs to shards. Pulled out so the balancing logic —
 * genuine algorithmic content, unlike the rest of that file's process orchestration — can be unit
 * tested directly, the same shape `mutation-baseline.ts` uses for the ratchet's own pure logic.
 */

/** One spec file, as `run-e2e-shards.ts` builds it from the glob. */
export interface Spec {
    file: string;
    key: string;
}

/** A spec with its weight resolved, sorted descending by `run-e2e-shards.ts` before packing. */
export interface WeightedSpec {
    file: string;
    weight: number;
}

/** One shard's assignment: which files, and their summed weight. */
export interface Shard {
    files: string[];
    load: number;
}

/**
 * Seconds per spec, from the run of 2026-08-14 (`npm run test:e2e`, total 12m54s).
 *
 * Refresh them from a run's summary table when the balance drifts — they only need to be roughly
 * right, since LPT is tolerant of error. A spec missing from this map is scheduled at the mean,
 * which keeps a newly added file from either hogging a shard or being treated as free.
 */
export const SECONDS: Record<string, number> = {
    uploads: 86,
    profile: 83,
    auth: 73,
    cart: 73,
    a11y: 69,
    products: 62,
    resilience: 57,
    locale: 52,
    storefront: 30,
    wishlist: 18,
    orders: 33,
    registration: 30,
    feedback: 26,
    commerce: 25,
    home: 20,
    'password-reset': 19,
    journey: 15,
    parity: 1
};

/**
 * Resolves each spec's weight from `durations`, falling back to the mean of the known durations
 * for a key `durations` does not carry — a newly added spec is scheduled at an average cost
 * rather than as hogging a shard (if the mean were 0) or being free (if it were skipped).
 *
 * @param specs - Spec files to weigh.
 * @param durations - Measured seconds per spec key, e.g. {@link SECONDS}.
 * @returns The specs with weights resolved, sorted heaviest first — what LPT needs to pack well.
 */
export const weighSpecs = (specs: Spec[], durations: Record<string, number>): WeightedSpec[] => {
    const known = Object.values(durations);
    const mean = known.reduce((sum, value) => sum + value, 0) / known.length;
    return specs
        .map(({ file, key }) => ({ file, weight: durations[key] ?? mean }))
        .toSorted((a, b) => b.weight - a.weight);
};

/**
 * Longest-processing-time bin-packing: each spec, heaviest first, joins whichever shard currently
 * carries the least load.
 *
 * @param weighted - Specs already sorted heaviest first, e.g. from {@link weighSpecs}.
 * @param shardCount - How many shards to pack into. A count above the number of specs simply
 *  leaves the extra shards empty rather than erroring.
 * @returns One entry per shard, in order, each carrying the files assigned to it and their
 *  summed weight.
 */
export const balanceShards = (weighted: WeightedSpec[], shardCount: number): Shard[] => {
    const shards: Shard[] = Array.from({ length: shardCount }, () => ({ files: [], load: 0 }));
    for (const { file, weight } of weighted) {
        let lightest = shards[0];
        for (const shard of shards) if (shard.load < lightest.load) lightest = shard;
        lightest.files.push(file);
        lightest.load += weight;
    }
    return shards;
};
