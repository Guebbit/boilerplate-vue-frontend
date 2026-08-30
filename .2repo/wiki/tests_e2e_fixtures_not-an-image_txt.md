# tests/e2e/fixtures/not-an-image.txt

## Purpose

A negative test fixture containing plain text (literally "not an image, on purpose") used in end-to-end tests to verify that the application correctly rejects or handles inputs that are not valid images. It exists as a deliberate contrast to `sample-image.png`.

## Key elements

- **Content:** A single line of plain text: `not an image, on purpose`. No binary data, no image headers, no encoding trickery.

## Relationships

- **`tests/e2e/fixtures/sample-image.png`** — Serves as the positive counterpart. Tests that exercise image processing or upload paths feed this `.txt` file where an image is expected and assert an error or fallback behavior, while `sample-image.png` drives the happy-path assertions.

## Notes

- The filename (`.txt`) and the content reinforce each other: this is *not* a mislabeled binary. Do not rename it to `.png` or swap its contents with `sample-image.png`.
- Tests referencing this fixture likely check for specific error messages or 4xx/5xx responses; the exact string "not an image, on purpose" is the payload being sent, not documentation.
