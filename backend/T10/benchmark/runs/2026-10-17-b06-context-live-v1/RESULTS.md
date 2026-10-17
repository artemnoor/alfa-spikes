# T10 live B06 context and participant-recovery probe — 2026-10-17-b06-context-live-v1

- 3 frozen targeted cases, including one ambiguous-company negative control.
- Models: DeepSeek=deepseek/deepseek-v4-flash; B07 reviewer=deepseek/deepseek-v4-flash.
- TP/FP/FN/TN: 2/1/0/0; accuracy 66.7%; false acceptance 100.0%.
- Calls 6 (0 failed), tokens 4701/488, cost ₽0.015261.
- This targeted live probe validates behavior only for these three cases; it is not a general extraction-quality estimate.

| Case | Scenario | Gold | Final | Result |
|---|---|---|---|---|
| CC01 | unique-cross-chunk-company-reference | SUPPORTED | accepted | pass |
| CC02 | ambiguous-cross-chunk-company-reference | reject | accepted | FAIL |
| CC03 | quoted-unique-type-participant-recovery | SUPPORTED | accepted | pass |

Full quotes, recovered entities, model calls and rejection reasons are in results.json.
