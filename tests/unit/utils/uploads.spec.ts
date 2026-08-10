/**
 * Unit tests for the client-side upload limits.
 *
 * These numbers are a hand-maintained copy of the backend's (`storage.ts`), which is the whole
 * reason they deserve a test: nothing generated will announce a drift, so the shape of the rule
 * — which types pass, where exactly the size boundary sits — is pinned here instead.
 *
 * What is NOT asserted, deliberately: that a rejected file is unsafe. The backend gates every
 * upload twice regardless of what happens here, and re-testing security in the browser would
 * suggest the browser is where it lives.
 */
import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

import { loadLocale } from '@/utils/i18n.ts';
import {
    ACCEPTED_IMAGE_TYPES,
    ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE,
    MAX_UPLOAD_BYTES,
    formatUploadSize,
    MAX_UPLOAD_SIZE_LABEL,
    imageUploadSchema,
    isAcceptedImageType,
    isWithinUploadSizeLimit,
    useUploadProgress
} from '@/utils/uploads.ts';
import enMessages from '@/locales/en.json';
import itMessages from '@/locales/it.json';

const setLocale = (locale: string) => loadLocale(locale).then(() => nextTick());

/**
 * A file of an exact byte length, without allocating a real image: the client-side rules only
 * ever look at `type` and `size`.
 */
const fileOfSize = (bytes: number, type = 'image/png') =>
    new File([new Uint8Array(bytes)], 'photo.png', { type });

/**
 * Pulls the `onUploadProgress` callback out of the axios options `trackUpload` handed to `send`,
 * so a test can drive the progress bar without a real request.
 */
const progressCallbackOf = (options?: AxiosRequestConfig) => options?.onUploadProgress;

/** Fires that callback with a partial axios progress event. */
const reportProgress = (
    options: AxiosRequestConfig | undefined,
    event: Partial<AxiosProgressEvent>
) => progressCallbackOf(options)?.(event as AxiosProgressEvent);

const messagesOf = (value: unknown) =>
    imageUploadSchema.safeParse(value).error?.issues.map(({ message }) => message) ?? [];

describe('accepted types', () => {
    it.each(ACCEPTED_IMAGE_TYPES)('accepts %s', (type) => {
        expect(isAcceptedImageType(fileOfSize(1, type))).toBe(true);
    });

    it.each(['image/gif', 'image/svg+xml', 'application/pdf', 'text/plain', ''])(
        'rejects %s',
        (type) => {
            expect(isAcceptedImageType(fileOfSize(1, type))).toBe(false);
        }
    );

    /**
     * Not a canonical mime type, but browsers emit it and the backend's list carries it. Dropping
     * it here would reject files the API would have accepted.
     */
    it('accepts the non-canonical image/jpg alongside image/jpeg', () => {
        expect(isAcceptedImageType(fileOfSize(1, 'image/jpg'))).toBe(true);
        expect(isAcceptedImageType(fileOfSize(1, 'image/jpeg'))).toBe(true);
    });

    it('derives the accept attribute from the same list', () => {
        expect(ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE.split(',')).toEqual([...ACCEPTED_IMAGE_TYPES]);
    });
});

describe('size limit', () => {
    it('defaults to the backend’s 5 MB', () => {
        expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
    });

    /**
     * The boundary is inclusive on both sides of the comparison the backend makes: multer's
     * `limits.fileSize` rejects what EXCEEDS the limit, so a file of exactly the limit is legal.
     * An off-by-one here would reject a file the API would have taken.
     */
    it('accepts a file of exactly the limit and rejects one byte more', () => {
        expect(isWithinUploadSizeLimit(fileOfSize(MAX_UPLOAD_BYTES))).toBe(true);
        expect(isWithinUploadSizeLimit(fileOfSize(MAX_UPLOAD_BYTES + 1))).toBe(false);
    });

    it('accepts an empty file, which is the backend’s problem and not the picker’s', () => {
        expect(isWithinUploadSizeLimit(fileOfSize(0))).toBe(true);
    });

    it.each([
        [5 * 1024 * 1024, '5 MB'],
        [1.5 * 1024 * 1024, '1.5 MB'],
        [512 * 1024, '0.5 MB']
    ])('renders %i bytes as %s', (bytes, expected) => {
        expect(formatUploadSize(bytes)).toBe(expected);
    });

    /** The field hint and the size-exceeded message must quote the same number. */
    it('exposes the limit as one shared label', () => {
        expect(MAX_UPLOAD_SIZE_LABEL).toBe(formatUploadSize(MAX_UPLOAD_BYTES));
    });
});

describe('imageUploadSchema', () => {
    beforeAll(() => setLocale('en'));
    afterEach(() => setLocale('en'));

    it('passes a valid image', () => {
        expect(imageUploadSchema.safeParse(fileOfSize(1024)).success).toBe(true);
    });

    /**
     * The field is optional on every one of the four forms: a form saved without touching the
     * picker must not fail validation.
     */
    it('passes when nothing was picked', () => {
        // The explicit `undefined` IS the case under test — an untouched picker.
        // eslint-disable-next-line unicorn/no-useless-undefined
        expect(imageUploadSchema.safeParse(undefined).success).toBe(true);
    });

    it('rejects a file of the wrong type, naming the type as the problem', () => {
        expect(messagesOf(fileOfSize(1024, 'image/gif'))).toEqual([
            enMessages['image-upload-form']['wrong-type']
        ]);
    });

    it('rejects an oversized file, naming the size as the problem', () => {
        expect(messagesOf(fileOfSize(MAX_UPLOAD_BYTES + 1))).toEqual([
            enMessages['image-upload-form']['size-exceeded'].replace(
                '{size}',
                MAX_UPLOAD_SIZE_LABEL
            )
        ]);
    });

    it('rejects a value that is not a file at all', () => {
        expect(imageUploadSchema.safeParse('/images/photo.png').success).toBe(false);
    });

    /**
     * The thunk contract every schema in this app keeps: one module-scope object, parsed twice,
     * in two languages, with nothing rebuilt in between. See `@/features/users/schemas.ts`.
     */
    it('follows the active locale from the same schema object', () => {
        expect(messagesOf(fileOfSize(1024, 'image/gif'))).toEqual([
            enMessages['image-upload-form']['wrong-type']
        ]);

        return setLocale('it').then(() => {
            expect(messagesOf(fileOfSize(1024, 'image/gif'))).toEqual([
                itMessages['image-upload-form']['wrong-type']
            ]);
        });
    });
});

describe('useUploadProgress', () => {
    /**
     * `undefined` and `0` are different states — idle, versus a request that has started and sent
     * nothing yet — and `FormImageUpload` shows the bar for one and not the other.
     */
    it('starts idle rather than at zero', () => {
        expect(useUploadProgress().uploadProgress.value).toBeUndefined();
    });

    /**
     * The point of the whole helper: no file means no progress callback, so a plain field edit
     * does not flash the bar to 100% for a payload measured in bytes.
     */
    it('attaches no axios options at all when there is no file', () => {
        const { trackUpload } = useUploadProgress();
        const send = vi.fn().mockResolvedValue('done');

        return trackUpload(undefined, send).then(() => {
            expect(send).toHaveBeenCalledWith(undefined);
        });
    });

    it('attaches a progress callback when there is a file', () => {
        const { trackUpload } = useUploadProgress();
        const send = vi.fn().mockResolvedValue('done');

        return trackUpload(fileOfSize(1), send).then(() => {
            expect(progressCallbackOf(send.mock.calls[0][0])).toBeInstanceOf(Function);
        });
    });

    it('converts axios’ 0–1 fraction into a percentage while the call runs', () => {
        const { uploadProgress, trackUpload } = useUploadProgress();

        return trackUpload(fileOfSize(1), (options) => {
            reportProgress(options, { progress: 0.42 });
            expect(uploadProgress.value).toBe(42);
            return Promise.resolve();
        });
    });

    /**
     * `event.progress` is absent when the total size is unknown — a chunked or compressed
     * request. The bar stays at 0 instead of jumping about on a number that means nothing.
     */
    it('falls back to zero when the total size is unknown', () => {
        const { uploadProgress, trackUpload } = useUploadProgress();

        return trackUpload(fileOfSize(1), (options) => {
            reportProgress(options, { loaded: 1024 });
            expect(uploadProgress.value).toBe(0);
            return Promise.resolve();
        });
    });

    it('passes the result of the call straight through', () => {
        const { trackUpload } = useUploadProgress();

        return expect(trackUpload(fileOfSize(1), () => Promise.resolve('created'))).resolves.toBe(
            'created'
        );
    });

    it('returns to idle once the call resolves, not to zero', () => {
        const { uploadProgress, trackUpload } = useUploadProgress();

        return trackUpload(fileOfSize(1), (options) => {
            reportProgress(options, { progress: 1 });
            return Promise.resolve();
        }).then(() => {
            expect(uploadProgress.value).toBeUndefined();
        });
    });

    /**
     * The `finally` earning its keep: a failed upload must not leave the bar frozen mid-flight
     * for as long as the form stays open.
     */
    it('returns to idle when the call rejects, and re-throws', () => {
        const { uploadProgress, trackUpload } = useUploadProgress();

        return expect(
            trackUpload(fileOfSize(1), (options) => {
                reportProgress(options, { progress: 0.5 });
                return Promise.reject(new Error('upload failed'));
            })
        )
            .rejects.toThrow('upload failed')
            .then(() => {
                expect(uploadProgress.value).toBeUndefined();
            });
    });
});
