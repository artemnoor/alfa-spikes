# SENTiVENT direct evidence gate run

Run on the same five user-provided news items using Jev top-three event selection followed by a separate direct-text evidence choice. Events with a direct-support score under 70% are replaced with `no_matching_event`.

- Completed: 5/5
- Event decisions retained after evidence check: 4/5
- Changed to `no_matching_event`: 1/5
- DeepSeek topic fallback: 3/5, at most one final call per escalated article
- API calls: 80
- Input tokens: 153,768
- Polza-reported cost: ₽2.67519955

| News | Final SENTiVENT event | Direct support |
|---|---|---:|
| Получение финансирования | Financing | 100% |
| Проблемы поставщика | Legal — Proceeding | 85% |
| Поглощение конкурента | Merger/Acquisition | 99% |
| Интервью о финансовых проблемах | Expense — Increase Expense | 100% |
| Опровержение сообщения о кибератаке | no_matching_event; CSR/Brand rejected | 6% |

The support score is Jev's model assessment, not a human-verified probability. The check asks Jev to identify a specific article passage that directly reports the selected event; the API response provides the score, not a quoted span.
