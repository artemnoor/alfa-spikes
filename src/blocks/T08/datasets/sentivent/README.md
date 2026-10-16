---
pretty_name: "SENTiVENT Bench: Economic Events and Implicit Sentiment in Financial News"
language:
- en
license: cc-by-4.0
annotations_creators:
- expert-generated
language_creators:
- found
language_details: en-US
multilinguality:
- monolingual
size_categories:
- n<1K
task_categories:
- token-classification
- text-classification
- text-generation
task_ids:
- sentiment-analysis
- sentiment-classification
- multi-label-classification
- named-entity-recognition
- coreference-resolution
tags:
- event-extraction
- sentiment-analysis
- financial-news
- information-extraction
- absa
- factuality
- financial-sentiment
- relation-extraction
- financial-nlp
- structured-output
- aspect-based-sentiment-analysis
- event-detection
configs:
- config_name: sentivent_unified_document
  default: true
  data_files:
  - split: train
    path: data/sentivent_unified_document/train.parquet
  - split: validation
    path: data/sentivent_unified_document/validation.parquet
  - split: test
    path: data/sentivent_unified_document/test.parquet
- config_name: sentivent_unified_document_continuous
  data_files:
  - split: train
    path: data/sentivent_unified_document_continuous/train.parquet
  - split: validation
    path: data/sentivent_unified_document_continuous/validation.parquet
  - split: test
    path: data/sentivent_unified_document_continuous/test.parquet
- config_name: sentivent_unified_document_with_canonical_referents
  data_files:
  - split: train
    path: data/sentivent_unified_document_with_canonical_referents/train.parquet
  - split: validation
    path: data/sentivent_unified_document_with_canonical_referents/validation.parquet
  - split: test
    path: data/sentivent_unified_document_with_canonical_referents/test.parquet
- config_name: sentivent_unified_sentence
  data_files:
  - split: train
    path: data/sentivent_unified_sentence/train.parquet
  - split: validation
    path: data/sentivent_unified_sentence/validation.parquet
  - split: test
    path: data/sentivent_unified_sentence/test.parquet
- config_name: sentivent_unified_sentence_continuous
  data_files:
  - split: train
    path: data/sentivent_unified_sentence_continuous/train.parquet
  - split: validation
    path: data/sentivent_unified_sentence_continuous/validation.parquet
  - split: test
    path: data/sentivent_unified_sentence_continuous/test.parquet
- config_name: sentivent_unified_sentence_with_canonical_referents
  data_files:
  - split: train
    path: data/sentivent_unified_sentence_with_canonical_referents/train.parquet
  - split: validation
    path: data/sentivent_unified_sentence_with_canonical_referents/validation.parquet
  - split: test
    path: data/sentivent_unified_sentence_with_canonical_referents/test.parquet
- config_name: sentivent_unified_bio_sentence
  data_files:
  - split: train
    path: data/sentivent_unified_bio_sentence/train.parquet
  - split: validation
    path: data/sentivent_unified_bio_sentence/validation.parquet
  - split: test
    path: data/sentivent_unified_bio_sentence/test.parquet
- config_name: ere_textee_sentence_e2e
  data_files:
  - split: train
    path: data/ere_textee_sentence_e2e/train.parquet
  - split: validation
    path: data/ere_textee_sentence_e2e/validation.parquet
  - split: test
    path: data/ere_textee_sentence_e2e/test.parquet
- config_name: ere_textee_sentence_eae
  data_files:
  - split: train
    path: data/ere_textee_sentence_eae/train.parquet
  - split: validation
    path: data/ere_textee_sentence_eae/validation.parquet
  - split: test
    path: data/ere_textee_sentence_eae/test.parquet
- config_name: ere_textee_sentence_ed
  data_files:
  - split: train
    path: data/ere_textee_sentence_ed/train.parquet
  - split: validation
    path: data/ere_textee_sentence_ed/validation.parquet
  - split: test
    path: data/ere_textee_sentence_ed/test.parquet
- config_name: iabsa_asqp_sentence
  data_files:
  - split: train
    path: data/iabsa_asqp_sentence/train.parquet
  - split: validation
    path: data/iabsa_asqp_sentence/validation.parquet
  - split: test
    path: data/iabsa_asqp_sentence/test.parquet
- config_name: iabsa_aste_sentence
  data_files:
  - split: train
    path: data/iabsa_aste_sentence/train.parquet
  - split: validation
    path: data/iabsa_aste_sentence/validation.parquet
  - split: test
    path: data/iabsa_aste_sentence/test.parquet
- config_name: iabsa_quad_sentence
  data_files:
  - split: train
    path: data/iabsa_quad_sentence/train.parquet
  - split: validation
    path: data/iabsa_quad_sentence/validation.parquet
  - split: test
    path: data/iabsa_quad_sentence/test.parquet
- config_name: ere_dygiepp_document
  data_files:
  - split: train
    path: data/ere_dygiepp_document/train.parquet
  - split: validation
    path: data/ere_dygiepp_document/validation.parquet
  - split: test
    path: data/ere_dygiepp_document/test.parquet
- config_name: sentivent_unified_uie_sentence
  data_files:
  - split: train
    path: data/sentivent_unified_uie_sentence/train.parquet
  - split: validation
    path: data/sentivent_unified_uie_sentence/validation.parquet
  - split: test
    path: data/sentivent_unified_uie_sentence/test.parquet
- config_name: ere_omnievent_sentence
  data_files:
  - split: train
    path: data/ere_omnievent_sentence/train.parquet
  - split: validation
    path: data/ere_omnievent_sentence/validation.parquet
  - split: test
    path: data/ere_omnievent_sentence/test.parquet
- config_name: sentivent_unified_oneie_sentence
  data_files:
  - split: train
    path: data/sentivent_unified_oneie_sentence/train.parquet
  - split: validation
    path: data/sentivent_unified_oneie_sentence/validation.parquet
  - split: test
    path: data/sentivent_unified_oneie_sentence/test.parquet
- config_name: ere_oneie_sentence
  data_files:
  - split: train
    path: data/ere_oneie_sentence/train.parquet
  - split: validation
    path: data/ere_oneie_sentence/validation.parquet
  - split: test
    path: data/ere_oneie_sentence/test.parquet
---

# SENTiVENT Bench: Economic Events and Implicit Sentiment in Financial News

![SENTiVENT annotation example](./assets/sentivent-annotation-example.png)

SENTiVENT is an expert human-annotated financial news dataset for research on what happens in company news and what sentiment those events imply. It supports financial event extraction, implicit financial sentiment analysis, aspect-based sentiment analysis (ABSA), and structured-output evaluation for ML systems and AI agents.
Here, implicit sentiment means investor-relevant polarity inferred from factual news through common sense and world knowledge, not only explicit opinion wording.
The resource is designed to be representative of the business-news genre: article selection avoids over-representing one company, sector, topic, or news event, and excludes robo-written or templated articles.

## How To Use

For most users and AI evaluation agents, start with `sentivent_unified_document`: `text` is the input, and `annotations` plus `relations` are the gold structured target.

```python
import evaluate
from datasets import load_dataset

test = load_dataset("GillesJacobs/sentivent", "sentivent_unified_document", split="test")

# Runnable empty baseline; replace this list with model predictions.
predictions = [
    {
        "id": row["id"],
        "tokens": row["tokens"],
        "annotations": [],
        "relations": {"event_sentiment": [], "event_coreference": []},
    }
    for row in test
]

metric = evaluate.load("GillesJacobs/sentivent_metric")
result = metric.compute(predictions=predictions, references=list(test))
summary = {
    "sentivent_score": result["sentivent_score"],
    "sentivent_macro_score": result["sentivent_macro_score"],
    "sentivent_relaxed_score": result["sentivent_relaxed_score"],
    "sentivent_relaxed_macro_score": result["sentivent_relaxed_macro_score"],
}
print(summary)

# {
#   "sentivent_score": 0.0,
#   "sentivent_macro_score": 0.0,
#   "sentivent_relaxed_score": 0.0,
#   "sentivent_relaxed_macro_score": 0.0
# }
```

Score version `0.4.0` defaults to `sentivent_score`, the strict mean of five extraction component F1 values weighted by fixed train+validation support. By default, the scorer also returns the unweighted macro companion and both relaxed companions. Set `include_factuality=True` to expand each enabled profile to twelve components by adding seven aligned factuality/context macro-F1 values.

Publication computes and freezes the component supports from the exact staged train+validation dataset; evaluated slices only renormalize those fixed supports over active components. This intentionally lets less-attested subtasks weigh less, while the macro companion preserves the equal-component view. See the [metric Space](https://huggingface.co/spaces/GillesJacobs/sentivent_metric), [normative specification](https://github.com/exverbai/sentivent-dataset/blob/main/integrations/huggingface-evaluate-metric/sentivent-metric-specification.md), and [replication appendix](https://github.com/exverbai/sentivent-dataset/blob/main/docs/sentivent_metric/scoring_policy.md) for exact formulas, alternatives, and primary-source literature rationale.

Load common model-family variants directly when you need framework-specific rows rather than the canonical document target:

```python
from datasets import load_dataset

dataset_id = "GillesJacobs/sentivent"

sentence_rows = load_dataset(dataset_id, "sentivent_unified_sentence")  # Sentence-window structured IE
continuous_docs = load_dataset(dataset_id, "sentivent_unified_document_continuous")  # Continuous-span extractors
bio_token_rows = load_dataset(dataset_id, "sentivent_unified_bio_sentence")  # BIO token classifiers
textee_event_rows = load_dataset(dataset_id, "ere_textee_sentence_e2e")  # TextEE event extraction
oneie_joint_rows = load_dataset(dataset_id, "sentivent_unified_oneie_sentence")  # OneIE-style event-sentiment rows
uie_spot_asoc_rows = load_dataset(dataset_id, "sentivent_unified_uie_sentence")  # UIE / Spot-Asoc generation
absa_quad_rows = load_dataset(dataset_id, "iabsa_quad_sentence")  # ABSA quad extraction
```

## What SENTiVENT Provides

SENTiVENT is intended for reproducible evaluation of information extraction and implicit sentiment in financial news.

- Expert annotations for economic events, event arguments, sentiment expressions, sentiment targets, and event-implied sentiment.
- A joint document-level target that links what happened, who or what it involved, and whether the news implies positive or negative sentiment.
- Stable train/dev/test splits matching the SENTiVENT papers for benchmark comparison.
- Ready-to-load document, sentence, token-label, ABSA, TextEE, UIE, OneIE, OmniEvent, DyGIE++, and LLM-evaluation views.

Implicit sentiment captures cases where factual business-news content changes a reader-investor's attitude toward a company, asset, person, product, or event because readers know what is desirable or undesirable in financial markets, even without words like `great` or `bad`.
Implicit sentiment in financial news is challenging because articles are written objectively and the evidence is lexically diverse and requires common-sense world knowledge to resolve.

## Uses

SENTiVENT is intended for researchers and ML practitioners evaluating financial NLP systems, information extraction models, sentiment models, and LLM agents on human-annotated financial news. The corpus covers English company-specific business-news articles about 30 S&P 500 companies from June 2016-May 2017, so results may not transfer directly to other languages, later market periods, informal text, non-US companies, or financial-advice settings.

The anonymized raw WebAnno/UIMA XMI source export is included under `raw_webanno_export/` for users who need the original annotation files. It is a source artifact, not a recommended modeling or evaluation config.

## Main Task

- The primary public config is `sentivent_unified_document`, the compact view for joint economic event extraction, implicit economic sentiment, and event-targeted sentiment in one structured target.
- `sentivent_unified_document` uses the full article text as input and emits event triggers, participants, fillers, sentiment expressions, non-event targets, and event-sentiment links with token, character, and text spans.
- `sentivent_unified_sentence` mirrors the same schema one source sentence at a time for smaller models, prompt-size constrained evaluation, and sentence-window pipelines; cross-sentence arguments, targets, and relation endpoints are omitted.
- Use `sentivent_unified_document_continuous` only for tools that cannot consume discontinuous spans; it fills span gaps and is therefore a derived lossy evaluation view.

## Joint Document Row Shape

The default config is an article-level JSON object. `text` is the model input; `annotations` and `relations` are the structured target. This compact example shows the main nested shapes; long token and annotation lists are shortened.

```json
{
  "id": "doc-1:sentivent_unified_document",
  "split": "train",
  "text": "Acme raised its 2017 revenue forecast after strong demand.",
  "tokens": ["Acme", "raised", "its", "2017", "revenue", "forecast", "..."],
  "annotations": [
    {
      "id": "ev-aal00-01",
      "kind": "event",
      "text": "raised",
      "span": {
        "discontinuous": false,
        "tokens": [1],
        "chars": [[5, 11]],
        "text": ["raised"]
      },
      "event_type": "Revenue",
      "event_subtype": "Increase_Revenue",
      "modality": false,
      "negated": false,
      "realis": "actual",
      "polarity": "positive",
      "scoped_polarity": "positive",
      "participants": [
        {
          "id": "part-aal00-01",
          "argument_id": "arg-aal00-01",
          "kind": "participant",
          "role": "Company",
          "text": "Acme",
          "span": {
            "discontinuous": false,
            "tokens": [0],
            "chars": [[0, 4]],
            "text": ["Acme"]
          }
        }
      ],
      "fillers": [
        {
          "id": "fill-aal00-01",
          "kind": "filler",
          "role": "TIME",
          "text": "2017",
          "span": {
            "discontinuous": false,
            "tokens": [3],
            "chars": [[16, 20]],
            "text": ["2017"]
          }
        }
      ]
    },
    {
      "id": "se-aal00-01",
      "kind": "sentiment",
      "text": "strong",
      "span": {
        "discontinuous": false,
        "tokens": [7],
        "chars": [[44, 50]],
        "text": ["strong"]
      },
      "polarity": "positive",
      "scoped_polarity": "positive",
      "negated": false,
      "uncertain": false,
      "targets": [
        {
          "id": "stgt-aal00-01",
          "sentiment_target_id": "stgt-link-aal00-01",
          "kind": "sentiment_target",
          "target_kind": "participant",
          "text": "Acme",
          "span": {
            "discontinuous": false,
            "tokens": [0],
            "chars": [[0, 4]],
            "text": ["Acme"]
          }
        }
      ]
    }
  ],
  "relations": {
    "event_sentiment": [
      {
        "id": "es-aal00-01",
        "from": "se-aal00-01",
        "to": "ev-aal00-01",
        "polarity": "positive"
      }
    ],
    "event_coreference": []
  }
}
```

## Corpus And Annotations

SENTiVENT contains company-specific English financial news about 30 S&P 500 companies from June 2016-May 2017. Articles were selected from diverse online business-news sources for sector balance, temporal spread, topical diversity, source quality, and suitability for detailed linguistic annotation; duplicate, low-relevance, templated, and non-company-specific items were removed.

The annotations cover ACE/ERE-style economic events and implicit economic sentiment in one joint layer: event triggers, event types/subtypes, participants, fillers, event coreference, event attributes, sentiment expressions, entity/aspect/event targets, polarity, and event-implied sentiment.

The holdout test set is a gold-standard expert-adjudicated reference set from a three-annotator agreement study. Reported agreement is almost-perfect for event main type (Fleiss kappa=0.877, Krippendorff alpha=0.874), substantial for event full type/subtype (kappa=0.813, alpha=0.809), and substantial for directly annotated sentiment polarity (kappa=0.778, alpha=0.782).

| Item | Total | Train/Dev | Test |
| --- | ---: | --- | ---: |
| documents | 288 | 228 train / 30 dev | 30 |
| sentences | 6,883 | 5,475 train / 681 dev | 727 |
| tokens | 170,398 | 135,317 train / 17,955 dev | 17,126 |
| event mentions | 6,245 | 4,636 train / 625 dev | 984 |
| event arguments | 13,780 | 10,135 train / 1,346 dev | 2,299 |
| participant arguments | 10,581 | 7,751 train / 1,048 dev | 1,782 |
| filler arguments | 3,199 | 2,384 train / 298 dev | 517 |
| event coreference links | 1,364 | 1,021 train / 125 dev | 218 |
| event type labels | 18 | - | - |
| event subtype labels | 42 | - | - |
| sentiment expressions | 3,669 | 2,954 train / 387 dev | 328 |
| sentiment-target tuples | 4,429 | 3,531 train / 483 dev | 415 |
| event-sentiment links | 102 | 71 train / 11 dev | 20 |

## Recommended Configs

| Config | Best for | Task and references |
| --- | --- | --- |
| sentivent_unified_document | Canonical joint benchmark for ML and LLM evaluation | Full-article structured IE: extract economic event triggers, types/subtypes, participants, fillers, implicit sentiment expressions/targets, and event-sentiment links. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4), [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554), and [SENTiVENT thesis](https://biblio.ugent.be/publication/8728891). |
| sentivent_unified_document_continuous | Systems that cannot represent discontinuous spans | Same joint document task for span-limited extractive tools; discontinuous spans are filled to one covering extent, so this is a lossy convenience view. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4) and [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). |
| sentivent_unified_sentence | Smaller-context joint sentence evaluation | One row per source sentence with the same event/sentiment schema as the document target. Cross-sentence arguments, targets, and relation endpoints are cut so each row is self-contained. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4), [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554), and [SENTiVENT thesis](https://biblio.ugent.be/publication/8728891). |
| sentivent_unified_sentence_continuous | Sentence-window tools that cannot represent discontinuous spans | Same sentence-level joint task, after row-local filtering, with retained discontinuous spans filled to one covering extent. This is a lossy convenience view for span-limited tools. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4) and [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). |
## Dataset Configs

- `sentivent_unified_document` is the default and recommended config for the full joint extraction task over article text.
- `sentivent_unified_document_continuous` is a derived evaluation variant that fills discontinuous spans to continuous ranges.
- `sentivent_unified_sentence` is the smaller-context sentence-window version of the same joint task; cross-sentence endpoints are cut so every row is self-contained.
- `sentivent_unified_sentence_continuous` applies the same sentence-window filtering and fills retained discontinuous spans to continuous ranges.
- `sentivent_unified_document_with_canonical_referents` is an opt-in variant that keeps document-level canonical-reference evidence inline.
- `sentivent_unified_sentence_with_canonical_referents` is the row-local canonical-reference audit variant for sentence windows.
- Interoperability configs expose complete task views for common event extraction, implicit ABSA, UIE, OneIE, OmniEvent, DyGIE++, TextEE, and BIO pipelines.

| Config | Description | train / validation / test |
| --- | --- | --- |
| sentivent_unified_document | Primary joint document-level benchmark: extract economic events, participants, fillers, implicit sentiment expressions, entity/aspect/event targets, polarity, and event-sentiment links. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4), [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554), and [SENTiVENT thesis](https://biblio.ugent.be/publication/8728891). | 228 / 30 / 30 |
| sentivent_unified_document_continuous | Lossy continuous-span variant of the joint document extraction task for tools that cannot represent discontinuous spans. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4) and [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). | 228 / 30 / 30 |
| sentivent_unified_document_with_canonical_referents | Opt-in joint document config with the same resolved spans as the default view plus inline `resolved_from` evidence for canonical referents, including standalone canonical-reference annotation items when needed. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4), [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554), and [SENTiVENT thesis](https://biblio.ugent.be/publication/8728891). | 228 / 30 / 30 |
| sentivent_unified_sentence | Sentence-window version of the joint event and implicit-sentiment task: one row per source sentence, with cross-sentence arguments, targets, and relation endpoints omitted so each row is self-contained. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4), [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554), and [SENTiVENT thesis](https://biblio.ugent.be/publication/8728891). | 5475 / 681 / 727 |
| sentivent_unified_sentence_continuous | Lossy continuous-span variant of the sentence-window joint task. It keeps the same sentence filtering, then fills retained discontinuous spans without crossing sentence boundaries. See the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4) and [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). | 5475 / 681 / 727 |
| sentivent_unified_sentence_with_canonical_referents | Sentence-window audit config with inline `resolved_from` evidence only when both the weak mention and canonical referent are inside the same sentence row. Cross-sentence referents are not imported. See the [SENTiVENT thesis](https://biblio.ugent.be/publication/8728891). | 5475 / 681 / 727 |
| sentivent_unified_bio_sentence | Joint event and sentiment sequence labeling: one BIO tag per token, with `ner_tags` for Hugging Face token-classification code and sidecars for overlaps. See [HF token classification](https://huggingface.co/tasks/token-classification), the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4), and the [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). | 5475 / 681 / 727 |
| ere_textee_sentence_e2e | TextEE-style sentence/window rows for event detection plus argument extraction; sentence configs follow the processed JSONL keys used by TextEE. See [TextEE](https://github.com/ej0cl6/TextEE/blob/main/data/README.md) and the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4). | 5475 / 681 / 727 |
| ere_textee_sentence_eae | TextEE-style sentence/window rows for event argument extraction; sentence configs follow the processed JSONL keys used by TextEE. See [TextEE](https://github.com/ej0cl6/TextEE/blob/main/data/README.md) and the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4). | 5475 / 681 / 727 |
| ere_textee_sentence_ed | TextEE-style sentence/window rows for event trigger detection/classification; sentence configs follow the processed JSONL keys used by TextEE. See [TextEE](https://github.com/ej0cl6/TextEE/blob/main/data/README.md) and the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4). | 5475 / 681 / 727 |
| iabsa_asqp_sentence | ASQP-style aspect sentiment quad prediction as delimiter-line rows with character spans and 0/1/2 polarity ids. See [ASQP](https://github.com/Datastory-CN/ASQP-Datasets) and the [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). | 5475 / 681 / 727 |
| iabsa_aste_sentence | ASTE-style aspect sentiment triplet extraction as delimiter-line rows and companion `.txt` split files. See [ASTE](https://github.com/xuuuluuu/SemEval-Triplet-data) and the [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). | 5475 / 681 / 727 |
| iabsa_quad_sentence | Implicit economic ABSA quad extraction: target, aspect category, opinion expression, and polarity. See [ASQP](https://github.com/Datastory-CN/ASQP-Datasets) and the [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). | 5475 / 681 / 727 |
| ere_dygiepp_document | Upstream DyGIE++ document-level event extraction rows with document-token indices, NER spans, and event argument records. See [DyGIE++](https://github.com/dwadden/dygiepp/blob/master/doc/data.md) and the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4). | 228 / 30 / 30 |
| sentivent_unified_uie_sentence | UIE text-to-spot-asoc sentence rows for joint event and sentiment extraction as UIE spot-association targets. See [UIE](https://github.com/universal-ie/UIE/blob/main/docs/DATASETS.md), the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4), and the [implicit sentiment paper](https://www.mdpi.com/2079-9292/10/20/2554). | 5475 / 681 / 727 |
| ere_omnievent_sentence | OmniEvent unified event/entity rows; intended for legacy parity or framework adapters. See [OmniEvent](https://github.com/THU-KEG/OmniEvent/tree/main/scripts/data_processing) and the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4). | 5474 / 681 / 727 |
| sentivent_unified_oneie_sentence | OneIE/TextEE-style event rows with SENTiVENT sentiment-target relation extensions; intended for legacy parity or framework adapters. See [OneIE](https://aclanthology.org/2020.acl-main.713/), [TextEE](https://github.com/ej0cl6/TextEE/blob/main/data/README.md), and the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4). | 5474 / 681 / 727 |
| ere_oneie_sentence | OneIE/TextEE-style event rows; intended for legacy parity or framework adapters. See [OneIE](https://aclanthology.org/2020.acl-main.713/), [TextEE](https://github.com/ej0cl6/TextEE/blob/main/data/README.md), and the [event extraction paper](https://doi.org/10.1007/s10579-021-09562-4). | 5474 / 681 / 727 |

## Splits

The public configs preserve the original SENTiVENT v1 paper split membership `v1`: 228 train documents, 30 dev documents, and 30 test documents. Hugging Face publishes the source `dev` split as `validation`; document membership is unchanged.

## Citation and License

If you use SENTiVENT, please cite the dataset itself:

```bibtex
@dataset{jacobs2020sentivent,
  title={SENTiVENT Bench: Economic Events and Implicit Sentiment in Financial News},
  author={Jacobs, Gilles},
  publisher={OSF},
  year={2020},
  version={1.1},
  doi={10.17605/OSF.IO/8JEC2},
  url={https://doi.org/10.17605/OSF.IO/8JEC2}
}
```

For event extraction or annotation methodology, also cite:

```bibtex
@article{jacobs2022sentiventenablingeconomicevents,
  title={SENTiVENT: enabling supervised information extraction of company-specific events in economic and financial news},
  author={Jacobs, Gilles and Hoste, Veronique},
  journal={Language Resources and Evaluation},
  volume={56},
  number={1},
  pages={225--257},
  year={2022},
  doi={10.1007/s10579-021-09562-4},
  url={https://doi.org/10.1007/s10579-021-09562-4}
}
```

When using the sentiment annotations or sentiment configurations, also cite:

```bibtex
@article{jacobs2021finegrainedimplicitsentiment,
  title={Fine-Grained Implicit Sentiment in Financial News: Uncovering Hidden Bulls and Bears},
  author={Jacobs, Gilles and Hoste, Veronique},
  journal={Electronics},
  volume={10},
  number={20},
  pages={2554},
  year={2021},
  doi={10.3390/electronics10202554},
  url={https://doi.org/10.3390/electronics10202554}
}
```

For annotation guidelines and more details:

```bibtex
@phdthesis{jacobs2021dissertation,
  title={Extracting Fine-Grained Events and Sentiment from Economic News},
  author={Jacobs, Gilles},
  school={Ghent University},
  year={2021},
  url={https://biblio.ugent.be/publication/8728891}
}
```

The SENTiVENT dataset, annotations, schemas, release metadata, dataset card, and
documentation are licensed under the Creative Commons Attribution 4.0 International
license (CC BY 4.0); see [LICENSE](./LICENSE). Executable integration adapters and
configuration under [`integrations/`](./integrations/) are licensed under the
[Apache License 2.0](./LICENSES/LICENSE-APACHE-2.0.txt). See the
[license scope notice](./LICENSES/NOTICE.md) for the complete file-level boundary and
third-party exclusions. The citation requests above are not additional license
conditions.
## Release Provenance

- Release tag: `sentivent-guidelines-v1.1-20260714-g7b759a38329c`.
- Annotation guidelines version: `v1.1`.
- Build timestamp: `2026-07-14T23:04:09.400815+00:00`.
- Builder git commit: `7b759a38329c`.
- Machine-readable release tag metadata is in `metadata/release_tags.json`.
