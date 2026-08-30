# tests/unit/infrastructure/utils/uploads.spec.ts

## Purpose

Pins the client-side upload validation rules (accepted MIME types, size boundary, schema behavior) so that a silent drift from the backend's `storage.ts` constants is caught. The client-side constants are a hand-maintained copy; without these tests nothing generated would flag a divergence.

## Key elements

- **`fileOfSize(bytes, type?)`** — test helper that builds a `File` of an exact byte length without allocating a real image (only `type` and `size` matter to the rules under test).
- **`messagesOf(value)`** — runs `imageUploadSchema.safeParse` and extracts the array of error messages (empty array on success).
- **`setLocale(locale)`** — loads a locale via `loadLocale` and awaits `nextTick` so Vue reactive bindings settle before assertions.
- **`describe('accepted types')`** — verifies `isAcceptedImageType` accepts every entry in `ACCEPTED_IMAGE_TYPES` (including non-canonical `image/jpg`), rejects a fixed list of non-image types, and that `ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE` is derived from the same list.
- **`describe('size limit')`** — asserts `MAX_UPLOAD_BYTES` equals 5 MiB, that the boundary is inclusive (exactly the limit passes, one byte over fails), and that a 0-byte file passes.
- **`describe('imageUploadSchema')`** — validates the zod schema end-to-end: valid file passes, `undefined` passes (optional field), wrong type and oversized file produce the correct localized error message, a non-File value is rejected, and the same schema object follows the active locale (tested by switching `en` → `it` without rebuilding the schema).

## Relationships

The dependency graph reports no neighbors for this file. It imports from `@/infrastructure/utils/uploads.ts`, `@/infrastructure/i18n`, and `@/locales/{en,it}.json`, but no reverse-dependency edges are recorded.

## Notes

- Deliberately **not** tested: that a rejected file is actually unsafe. The backend gates every upload twice; re-asserting security in the browser would misleadingly imply the browser is the enforcement point.
- `image/jpg` is non-canonical but intentionally included in `ACCEPTED_IMAGE_TYPES` because real browsers emit it and the backend's whitelist carries it.
- The size boundary is **inclusive** (a file of exactly `MAX_UPLOAD_BYTES` is legal), mirroring multer's `limits.fileSize` which rejects only what *exceeds* the limit. An off-by-one here would reject a file the API would accept.
- The schema's optional nature (`undefined` → success) is a tested contract: four forms include the picker, and an untouched form must not fail validation.
- Locale test relies on the app-wide "thunk contract": one module-scope schema object is parsed repeatedly in different locales without being rebuilt (see `@/modules/users/schemas.ts` for the pattern).
