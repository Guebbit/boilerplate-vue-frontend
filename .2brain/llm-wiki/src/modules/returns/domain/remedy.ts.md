---
source: src/modules/returns/domain/remedy.ts
sha256: 1be5866f23b728a84af44b74d6055f18b0faaba19a64348e7262206c0290e7ce
signature: 3df8332df1ece337c80f96463740c5fa8209285b1e47d42c77aa63871fd75b1f
generated_at: 2026-11-10T05:37:33.417527+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/domain/remedy.ts

## Purpose

Domain constants and logic that encode which remedies (repair, replace, refund) are legally available for a given return reason, per EU Directive 2019/771 Art. 13. It exists to keep the client-side forms from offering remedies the server would reject, and to determine when the buyer gets a choice at all.

## Key elements

- **`REMEDIES`** — `readonly ['repair', 'replace', 'refund'] as const satisfies readonly ReturnRemedy[]`. The canonical, order-sensitive list of remedies; repair and replacement precede refund as required by law.
- **`hasRemedyChoice(reason: string): boolean`** — Returns `true` only for `'defective'` or `'wrong_item'`. These are the sole reasons where the buyer selects a remedy and where no handling deduction applies. All other reasons (e.g. change-of-mind) carry no remedy choice.

## Relationships

- **`ReturnRequestForm.vue`** — Consumes `REMEDIES` to render the remedy selector and calls `hasRemedyChoice` to decide whether to show that selector at all.
- **`ReturnStaffActions.vue`** — Uses `hasRemedyChoice` (and/or `REMEDIES`) to gate or display remedy options in the staff action panel.

## Notes

- The array order is semantically meaningful (legal priority), not arbitrary—do not reorder.
- `hasRemedyChoice` compares against raw string literals rather than the `ReturnRemedy` union; the parameter is typed as `string` deliberately to accept whatever the form passes before validation.
- The file is intentionally minimal: it is a pure domain rule, not a service. No side effects, no async work.
