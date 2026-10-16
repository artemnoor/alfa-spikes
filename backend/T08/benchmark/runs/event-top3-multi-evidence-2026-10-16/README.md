# JEV top-three events + batched evidence review

The five supplied articles were classified end to end with this event flow:

1. JEV traverses the event tree by top-three choices, preserving pruned alternatives from every visited branch.
2. DeepSeek checks the three leading final events in one response, returning a quote and support score per event.
3. The backend requires each quote to be an exact substring of the source article.
4. Among candidates passing the configured support threshold, the highest support score wins; Jev path probability breaks ties.
5. If no main candidate passes, one bounded recovery traversal searches previously pruned categories (up to eight JEV calls). DeepSeek reviews up to three recovered leaves in one additional response.
6. Only when no recovered candidate passes does the event become `no_matching_event`.

## Results

| Article | Event result | Evidence |
|---|---|---|
| Получение финансирования | Financing | Direct quote verified; Financing and Deal both supported, JEV path score selected Financing. |
| Проблемы поставщика | Legal — Proceeding | Exact bankruptcy-filing quote verified. |
| Поглощение конкурента | Merger/Acquisition | Exact acquisition quote verified; Deal was also supported, JEV path score selected Merger/Acquisition. |
| Интервью о финансовых проблемах | Expense — Increase Expense | Exact quote about logistics costs rising 38% verified. |
| Опровержение сообщения о кибератаке | `no_matching_event` | None of the three initial or three recovered event candidates had a quote meeting the threshold. Recovery used two JEV calls. |

The initial three candidates are each assessed in a single DeepSeek request. On the fifth article, a single recovery pass ran and DeepSeek checked the recovered alternatives in one additional request.

## Request and cost comparison

| Run | Calls | Input tokens | Cost |
|---|---:|---:|---:|
| Earlier five-article reference | 80 | 153,768 | ₽2.67519955 |
| This run | 77 | 148,763 | ₽2.59735382 |
| Difference | −3 (−3.75%) | −5,005 (−3.25%) | −₽0.07784573 (−2.91%) |

All five articles completed. The fifth story costs more than the others because it needed recovery search and the second evidence review. Full per-candidate quotes, scores, JEV calls, and costs are in `results.json`.
