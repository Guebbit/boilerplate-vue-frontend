export * from '@api';

// Generic helper (kept for any future extensions not covered by the spec)
export type WithFileUpload<T, K extends string = 'imageUpload'> = T & {
    [P in K]?: File;
};
