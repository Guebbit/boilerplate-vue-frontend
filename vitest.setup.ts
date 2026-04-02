import { beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { resetFakeApiState, setupFakeApi } from '@/mocks/fakeApi.ts';

beforeEach(() => {
    setActivePinia(createPinia());
    resetFakeApiState();
    setupFakeApi();
});
