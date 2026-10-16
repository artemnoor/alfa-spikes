# IPTC topic recovery run

This run used the five Russian news items in `../jev-recovering-top3-topic-2026-10-15/news.json` and the recovery-aware Jev + DeepSeek topic flow.

- Completed: 5/5
- DeepSeek topic decisions: 3/5
- Recovered alternatives added to DeepSeek shortlist: six per escalated article
- API calls: 74
- Input tokens: 147,335
- Polza-reported cost: ₽2.56974936

Results are in `results.json`. The displayed confidence and text-support values are model scores, not human-verified probabilities or gold labels. The cyber-attack fact-check remains classified as `cyber crime` with 40% Jev support: the IPTC taxonomy did not provide a better-supported broader candidate, and this run does not add a separate negation check.
