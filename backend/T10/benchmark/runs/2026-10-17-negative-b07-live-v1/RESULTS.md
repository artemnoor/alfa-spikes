# T10 live B07 negative benchmark — 2026-10-17-negative-b07-live-v1

- 10 hand-authored synthetic cases; one batched model request; model: deepseek/deepseek-v4-flash; status: completed.
- Tokens input/output: 1063/379; reported cost: 0.028957 ₽; latency: 23376 ms.
- TP/FP/FN/TN: 1/2/0/7; accuracy 80.0%; false acceptance 22.2% over 9 negative cases.
- This synthetic probe measures one model response and is diagnostic only; it is not an estimate of real-world semantic accuracy.

| ID | Adversarial family | Gold | Model decision | Result |
|---|---|---|---|---|
| N01 | direct-positive-control | SUPPORTED | accepted | pass |
| N02 | negation | reject | rejected | pass |
| N03 | conditional | reject | rejected | pass |
| N04 | future-status-mismatch | reject | rejected | pass |
| N05 | reversed-direction | reject | accepted | FAIL |
| N06 | co-mention-without-relation | reject | rejected | pass |
| N07 | ended-relationship | reject | rejected | pass |
| N08 | source-contradiction | reject | rejected | pass |
| N09 | prompt-injection | reject | rejected | pass |
| N10 | indirect-not-entailing | reject | accepted | FAIL |

Per-case reasons and raw review JSON are saved in results.json.
