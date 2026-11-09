/**
 * @module
 * `taskKindKey`: a known kind keeps its own key, an unknown one falls back to the generic word,
 * and both keys exist in every locale.
 */
import { describe, expect, it } from 'vitest';
import { taskKindKey } from '../task-kind.ts';
import en from '../locales/en.json';
import it_ from '../locales/it.json';
import { TaskKind } from '@/types/enums.ts';

describe('taskKindKey', () => {
    it.each(Object.values(TaskKind))('keeps the key of the known kind %s', (kind) => {
        expect(taskKindKey(kind)).toBe(`task-kind.${kind}`);
    });

    it('falls back to the generic key for a kind a newer backend sent', () => {
        expect(taskKindKey('kind_from_the_future')).toBe('task-kind.unknown');
    });

    it.each([
        ['en', en],
        ['it', it_]
    ])('has the generic word in the %s locale', (_name, locale) => {
        expect(locale['task-kind'].unknown).toBeTruthy();
    });
});
