import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import delay from "../delay";

it('allows purchases within business hours', async () => {
    beforeEach(() => {
        // tell vitest we use mocked time
        vi.useFakeTimers()
    })

    afterEach(() => {
        // restoring date after each test run
        vi.useRealTimers()
    })

    // If we want to set a specific time (not necessary)
    // access Date.now() will result in the date set above
    const date = new Date(2000, 1, 1, 12);
    console.log("11111111", new Date().getDate())
    vi.setSystemTime(date);
    console.log("2222222222", new Date().getDate())

    await expect(
        delay(500)
            .then(() => Date.now())
    ).resolves.toEqual(date.getTime() + 500);
})