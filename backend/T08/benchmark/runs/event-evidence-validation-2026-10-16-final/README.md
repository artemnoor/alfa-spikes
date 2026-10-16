# SENTiVENT evidence check: validation run

This is a small synthetic, manually labeled Russian news set for checking whether the selected SENTiVENT event has an exact quote in the article. It is an engineering check, not a representative or statistically powered calibration set.

## Setup

- JEV traverses the SENTiVENT taxonomy using top-three choices at each level.
- The final event is selected from the accumulated path scores; the separate final JEV event-choice call is skipped.
- If the selected event is not `no_matching_event`, DeepSeek V4 Flash returns the event ID, a short contiguous quote, and a support score from 0 to 1 in one JSON response.
- The backend validates `evidence_text` using an exact substring check against the article. It also checks the returned event ID and score range. A missing or invalid quote, or a score below the configured threshold, returns `no_matching_event`.
- Default threshold: `0.7`. This remains configurable and experimental.

JEV itself emits typed choices/scores rather than free-form text; the quote therefore comes from the single evidence-review request. See [Polza JEV](https://polza.ai/jev) and [TypeSafe JEV](https://polza.ai/models/typesafe/jev).

## Results

All 12 articles completed after retrying one response that was truncated during the initial run. The first truncated response is included in billed usage.

| Threshold | TP | FN | FP | TN | False rejection | False acceptance |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0.50 | 8 | 0 | 0 | 4 | 0% | 0% |
| 0.60 | 8 | 0 | 0 | 4 | 0% | 0% |
| 0.70 | 8 | 0 | 0 | 4 | 0% | 0% |
| 0.80 | 7 | 1 | 0 | 4 | 12.5% | 0% |
| 0.90 | 7 | 1 | 0 | 4 | 12.5% | 0% |

At `0.7`, no false rejection or false acceptance appeared in this sample. At `0.8`, the system rejected the directly reported appointment of a new CEO (score `0.75`), a false rejection. This supports keeping `0.7` as the current experimental setting, but does not establish it as a generally correct cutoff. Four negative samples are far too few to estimate a reliable false-acceptance rate.

The macroeconomic examples (credit-rate overview and aggregated industry sales) are labeled positive because SENTiVENT includes aggregated sector/market trends; they do not require a company-specific action.

## Spend and requests

- 32 calls for the 12 successful classifications (2.67 calls/article on average).
- 35 billed calls including the 3-call failed first attempt and the successful retry.
- 44,142 input tokens and 7,876 output tokens including the failed attempt.
- Polza-reported cost: ₽0.77111999 including the failed attempt.
- 11/12 articles needed an evidence review; the one directly selected as `no_matching_event` needed none.
- 8/8 positive cases returned a quote that passed exact substring validation.

The earlier five-article run used 80 requests / 153,768 input tokens / ₽2.67519955. The separate synthetic event-only benchmark is not directly comparable to that complete classification run. A same-five-article full rerun is stored alongside this benchmark when available.

## Files

- `results.json`: all outputs, quotes, labels, threshold metrics, and billed usage.
- `../event-evidence-validation-2026-10-16/news.json`: the 12 test articles and manual labels.
- `../run-event-evidence-validation.mjs`: reproducible event-only run.
- `../finalize-event-evidence-validation.mjs`: merges a retry and recomputes threshold metrics without more model calls.
