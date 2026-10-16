# Full classification rerun on the five supplied articles

This run uses the same five articles as `jev-event-evidence-gate-2026-10-16`, with event evidence returned by DeepSeek V4 Flash and checked as an exact substring by the backend.

## Cost comparison

| Run | Calls | Input tokens | Cost |
|---|---:|---:|---:|
| Previous five-article run | 80 | 153,768 | ₽2.67519955 |
| New full-classification run | 75 | 146,205 | ₽2.52503341 |
| Change | −5 (−6.25%) | −7,563 (−4.92%) | −₽0.15016614 (−5.61%) |

All five classifications completed. The call reduction comes from removing the separate final JEV event-choice request; the event evidence response now includes the event ID, quote, and support score.

## Event outputs

| Article | Proposed event | Final event | Quote verified | Score |
|---|---|---|---|---:|
| Получение финансирования | Financing | Financing | yes | 1.00 |
| Проблемы поставщика | Legal — Proceeding | `no_matching_event` | no quote returned | 0.00 |
| Поглощение конкурента | Merger/Acquisition | Merger/Acquisition | yes | 1.00 |
| Интервью о финансовых проблемах | Investment | `no_matching_event` | no quote returned | 0.00 |
| Опровержение сообщения о кибератаке | Product/Service — Cancellation/Recall | `no_matching_event` | no quote returned | 0.00 |

The first and third stories return exact quotes. The last one is a correct rejection for the alleged cyberattack, although JEV proposed a cancellation/recall event. The bankruptcy story contains an explicit bankruptcy filing, so its empty quote is a false rejection for this use case. The interview also describes an expense increase (`затраты компании на логистику за девять месяцев выросли на 38%`) even though JEV ranked Investment first and the evidence step rejected that candidate; this is another observed miss, likely due to an upstream candidate-selection error rather than substring validation. These two cases show why the 70% gate and candidate selection need broader labeled validation before being treated as reliable.

Exact substring validation is behaving as intended: no quote was accepted unless it appeared in the input article. `results.json` contains the full model and token/cost outputs.
