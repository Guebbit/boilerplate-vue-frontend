import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import axios from "../axios";

it('allows purchases within business hours', () => {
    // tell vitest we use mocked time
    beforeEach(() => vi.useFakeTimers())
    // restoring date after each test run
    afterEach(() => vi.useRealTimers())

    // // If we want to set a specific time (not necessary)
    // // access Date.now() will result in the date set above
    // const date = new Date(2000, 1, 1, 12);
    // vi.setSystemTime(date);

    // TODO
    return expect(axios).resolves.toEqual(axios);
})