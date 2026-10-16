# DeepSeek generation diagnostics — 2026-10-16

One saved synthetic article was sent through the configured Polza route to isolate reasoning-token usage from visible JSON. Provider usage returned `completion_tokens_details.reasoning_tokens`, so the split below comes from the API counters, not a character-based estimate. Saved raw responses preserve the JSON answer and usage object; reasoning text is redacted while its token count is retained.

## Findings

| Request setting | Input | Output | Reasoning | Visible JSON | Finish | Cost |
|---|---:|---:|---:|---:|---|---:|
| Previous verbose contract, `thinking: disabled` + `reasoning_effort: none` | 577 | 4,341 | 4,053 | 288 | stop | ₽0.15378958 |
| Compact contract, `thinking: disabled` only | 543 | 3,614 | 3,488 | 126 | stop | ₽0.07977841 |
| Compact contract, `reasoning_effort: low` + thinking disabled | 543 | 6,000 | 6,000 | 0 | length | ₽0.13541838 |
| Compact contract, `reasoning_effort: none` only | 543 | 5,147 | 5,002 | 145 | stop | ₽0.11301815 |
| Compact contract, Polza `reasoning: { effort: "none" }` | 425–464 | 140–294 | 0 | 140–294 | stop | ₽0.00482812–₽0.01093668 |

The first four rows show why a smaller `max_tokens` did not help: reasoning used most or all of the output budget before the JSON. The Polza `reasoning` object set to `none` is the setting that removed those tokens. With the final compact prompt, the model used 294 visible output tokens, 0 reasoning tokens, and ₽0.01093668 on one article. The backend now sends that setting, `temperature: 0`, and a 3,000-token hard ceiling.

The final response parsed, but two of its three proposed relations did not point to valid entity IDs. The backend now labels that result `partial_validation`, retains the valid graph parts, and reports the rejected relation count. Its model event quotes and facts passed exact substring and unit validation. This single-article check is not a five-news recall benchmark.

Eight diagnostic calls cost ₽0.52353103 in total (3,942 input and 19,888 output tokens). Two prompt/parser iterations used 149 output tokens at ₽0.01227460 and 203 output tokens at ₽0.01348711; those intermediate raw files were overwritten and their usage figures are included in the total. The final raw response and extraction result are in [`provider-raw-compact-no-reasoning-final-2026-10-16`](../provider-raw-compact-no-reasoning-final-2026-10-16/).

## Reproduction

From `backend/T08`:

```powershell
$env:T08_DIAGNOSTIC_MAX_TOKENS='3000'
node benchmark/inspect-provider-output.mjs benchmark/runs/entity-status-five-news-2026-10-16/news.json benchmark/runs/provider-raw-compact-no-reasoning-final-2026-10-16
```

The script writes `provider-request.json`, `provider-raw-response.json`, `analysis.json`, and `extraction-result.json`. It does one paid Polza request.
