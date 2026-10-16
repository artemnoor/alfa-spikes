# Jev top-3 with recovery and conditional DeepSeek

Run date: 2026-10-15. The run classifies the five supplied news items through the same `classifyNews` pipeline used by T08. `results.json` stores each input, full response, confidence signals, alternatives, per-item model usage, and cost. `news.json` contains the inputs. Reproduce it with `node benchmark/run-five-news.mjs` from `backend/T08`.

## Results

| News | IPTC topic | Jev text support | DeepSeek | SENTiVENT event | IPTC genre |
|---|---|---:|---|---|---|
| Получение финансирования | loans and lending | 0.71 | No | Financing | Press Release |
| Проблемы поставщика | bankruptcy | 0.94 | No | Proceeding | Current Events |
| Поглощение конкурента | merger or acquisition | 0.94 | No | Merger/Acquisition | Current Events |
| Интервью о финансовых проблемах | financially distressed company | 0.31 | Yes: weak text support | Increase Expense | Interview |
| Опровержение сообщения о кибератаке | cyber crime | 0.43 | Yes: weak text support | CSR/Brand | Fact Check |

For the financing story, Jev initially preferred a manufacturing branch. The text-support check exposed the mismatch, the search reopened the retained `products and services` branch, and the final shortlist included `loans and lending`. Jev then selected it with 0.96 confidence and 0.92 top-two margin; its per-topic text-support score was 0.71, so DeepSeek was not needed.

The interview story remains less certain: Jev and DeepSeek chose `financially distressed company`, but Jev's text-support score was 0.31. The cyberattack story also received a low support score (0.43), so DeepSeek was asked to recheck the shortlist. These labels are model outputs, not human-verified ground truth. In particular, review the event result `CSR/Brand` for the fact-check story.

## Usage

- 5 of 5 classifications completed.
- DeepSeek fallback used for 2 of 5 topic decisions; it received 10 candidates on each call.
- 71 total API requests across topic, event, and genre classification.
- 127,559 input tokens.
- Polza-reported total cost: **₽2.229075** for this final run.

The Jev choice and text-support scores use the returned probability distributions. They are useful routing signals, not a substitute for a labeled benchmark.
