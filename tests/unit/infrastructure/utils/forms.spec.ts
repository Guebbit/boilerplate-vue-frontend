import { describe, expect, it, vi } from 'vitest';
import * as schemas from '@api/schemas';
import {
    omitNulls,
    shapeBody,
    toRequestBody,
    uploadThenClear
} from '@/infrastructure/utils/forms.ts';

describe('shapeBody', () => {
    /** The PATCH body schema the cases clear fields on. */
    const patch = schemas.UpdateUserByIdBody;

    it('spells a cleared nullable field as null', () => {
        expect(shapeBody(patch, { phone: '' })).toEqual({ phone: null });
    });

    it("spells a cleared pattern-guarded field as null too (locale refuses `''` by pattern, not minLength)", () => {
        expect(shapeBody(patch, { locale: '' })).toEqual({ locale: null });
    });

    it('omits an emptied field that has no clear spelling (a create has nothing to clear)', () => {
        expect(shapeBody(schemas.CreateWebhookSubscriptionBody, { description: '' })).toEqual({});
    });

    it("keeps `''` where the schema accepts it", () => {
        expect(shapeBody(schemas.CreateLocaleEntryBody, { value: '' })).toEqual({ value: '' });
    });

    it('never emits undefined keys', () => {
        expect(shapeBody(patch, { phone: undefined, website: 'https://a.test' })).toEqual({
            website: 'https://a.test'
        });
    });

    it('passes a key the schema does not know straight through', () => {
        const file = new Blob(['x']);
        expect(shapeBody(patch, { imageUpload: file }).imageUpload).toBe(file);
    });

    describe('with a baseline (PATCH)', () => {
        it('omits every field equal to the loaded record', () => {
            expect(
                shapeBody(patch, { username: 'ann', phone: '1' }, { username: 'ann', phone: '0' })
            ).toEqual({ phone: '1' });
        });

        it("reads `''`, undefined and null as one value, so an untouched empty is not a clear", () => {
            expect(
                shapeBody(patch, { phone: '', website: undefined }, { phone: null, website: '' })
            ).toEqual({});
        });

        it('sends a clear when the record had a value and the form emptied it', () => {
            expect(shapeBody(patch, { phone: '' }, { phone: '123' })).toEqual({ phone: null });
        });

        it('compares arrays deeply', () => {
            expect(
                shapeBody(schemas.UpdateProductByIdBody, { tags: ['a'] }, { tags: ['a'] })
            ).toEqual({});
            expect(
                shapeBody(schemas.UpdateProductByIdBody, { tags: ['a', 'b'] }, { tags: ['a'] })
            ).toEqual({ tags: ['a', 'b'] });
        });
    });

    describe('nested objects', () => {
        const create = schemas.CreateProductBody;

        it('keeps a removed locale as null and a nullable child spelled per its own schema', () => {
            expect(shapeBody(create, { translations: { en: { title: 'a' }, it: null } })).toEqual({
                translations: { en: { title: 'a' }, it: null }
            });
        });

        it('diffs a nested object against its own baseline and drops what did not change', () => {
            expect(
                shapeBody(
                    schemas.UpdateProductByIdBody,
                    { translations: { en: { title: 'a' }, it: { title: 'b' } } },
                    { translations: { en: { title: 'a' }, it: { title: 'c' } } }
                )
            ).toEqual({ translations: { it: { title: 'b' } } });
        });
    });

    it('produces a body the schema itself accepts', () => {
        const body = shapeBody(patch, { username: 'ann', phone: '', locale: '', website: '' });
        expect(patch.safeParse(body).success).toBe(true);
    });
});

describe('toRequestBody', () => {
    it('loads the named schema and shapes the body against it', () =>
        expect(toRequestBody('UpdateUserByIdBody', { phone: '' })).resolves.toEqual({
            phone: null
        }));
});

describe('uploadThenClear', () => {
    it('sends one multipart request when there is nothing to clear', async () => {
        const upload = vi.fn(() => Promise.resolve('uploaded'));
        const clear = vi.fn(() => Promise.resolve('cleared'));

        await expect(uploadThenClear({ a: 'x', b: 1 }, upload, clear)).resolves.toBe('uploaded');

        expect(upload).toHaveBeenCalledWith({ a: 'x', b: 1 });
        expect(clear).not.toHaveBeenCalled();
    });

    it('takes the nulls out of the multipart and sends them after, as their own request', async () => {
        const upload = vi.fn(() => Promise.resolve('uploaded'));
        const clear = vi.fn(() => Promise.resolve('cleared'));

        await expect(uploadThenClear({ a: 'x', phone: null }, upload, clear)).resolves.toBe(
            'cleared'
        );

        expect(upload).toHaveBeenCalledWith({ a: 'x' });
        expect(clear).toHaveBeenCalledWith({ phone: null });
    });

    it('does not send the clears when the upload failed, and surfaces that failure', async () => {
        const clear = vi.fn(() => Promise.resolve('cleared'));

        await expect(
            uploadThenClear({ phone: null }, () => Promise.reject(new Error('boom')), clear)
        ).rejects.toThrow('boom');

        expect(clear).not.toHaveBeenCalled();
    });
});

describe('omitNulls', () => {
    it('keeps a non-null value among the given keys', () => {
        expect(omitNulls({ weight: 100, imageUrl: 'x', other: 1 }, ['weight', 'imageUrl'])).toEqual(
            { weight: 100, imageUrl: 'x' }
        );
    });

    it('drops a null value among the given keys', () => {
        expect(omitNulls({ weight: null, imageUrl: 'x' }, ['weight', 'imageUrl'])).toEqual({
            imageUrl: 'x'
        });
    });

    it('ignores a key outside the given list, null or not', () => {
        expect(omitNulls({ weight: 100, other: null }, ['weight'])).toEqual({ weight: 100 });
    });
});
