# T10 live B07 negative benchmark — 2026-10-17-negative-b07-live-v2

- 10 hand-authored synthetic cases; 2 passed the deterministic B07 gate and were sent in one batch; model: deepseek/deepseek-v4-flash; status: completed.
- Tokens input/output: 396/93; reported cost: 0.001565 ₽; latency: 2078 ms.
- TP/FP/FN/TN after both stages: 1/0/0/9; accuracy 100.0%; false acceptance 0.0% over 9 negative cases.
- This synthetic probe is diagnostic only; it is not an estimate of real-world semantic accuracy.

| ID | Adversarial family | Gold | Final decision | Result |
|---|---|---|---|---|
| N01 | direct-positive-control | SUPPORTED | accepted | pass |
| N02 | negation | reject | rejected | pass |
| N03 | conditional | reject | rejected | pass |
| N04 | future-status-mismatch | reject | rejected | pass |
| N05 | reversed-direction | reject | rejected | pass |
| N06 | co-mention-without-relation | reject | rejected | pass |
| N07 | ended-relationship | reject | rejected | pass |
| N08 | source-contradiction | reject | rejected | pass |
| N09 | prompt-injection | reject | rejected | pass |
| N10 | indirect-not-entailing | reject | rejected | pass |

Per-case deterministic errors, semantic reasons and raw review JSON are saved in results.json.
