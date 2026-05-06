export const toMultipartFormData = <T extends object>(payload: T): FormData => {
    const formData = new FormData();

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
        if (value === undefined || value === null) continue;

        if (Array.isArray(value)) {
            for (const item of value) {
                if (item === undefined || item === null) continue;
                formData.append(key, item instanceof Blob ? item : String(item));
            }
            continue;
        }

        formData.append(key, value instanceof Blob ? value : String(value));
    }

    return formData;
};
