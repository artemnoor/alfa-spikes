# Flat IPTC topic smoke test

Date: 2026-10-15 UTC  
Topic model: `deepseek/deepseek-v4-flash` via Polza AI  
Event and genre model: `typesafe/jev`

The topic request included all 1,085 active IPTC Media Topic concepts in one request. Each option contained its QCode, full parent path, label, and English description.

For the saved synthetic news item, DeepSeek selected `artificial intelligence` with the path `science and technology > technology and engineering > information technology and computer science > artificial intelligence`. Jev selected event `Launch` and genre `Current Events`.

The combined request used 60,641 input tokens and cost ₽0.34510025. The topic call used 55,649 input tokens and cost ₽0.25751312. This is a single smoke example, not an accuracy benchmark. The full input and API result are in `smoke-result.json`.
