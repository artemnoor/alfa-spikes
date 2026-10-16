# Copyright (c) Gilles Jacobs.
# SPDX-License-Identifier: Apache-2.0

"""Inspect starter tasks for SENTiVENT structured extraction."""

from __future__ import annotations

from inspect_ai import Task, task
from inspect_ai.dataset import Sample, hf_dataset
from inspect_ai.scorer import json_schema

DATASET_ID = "GillesJacobs/sentivent"
TASK_CONFIGS = ["sentivent_unified_uie_sentence"]


def _record_to_sample(record: dict[str, object], *, config: str) -> Sample:
    """Convert a SENTiVENT Hugging Face row into an Inspect sample."""
    return Sample(
        input=str(record["text"]),
        target=record["record"],
        metadata={
            "id": record["id"],
            "task_config": config,
            "split": record["split"],
        },
    )


def _sample_mapper(config: str):
    """Return an Inspect row mapper with task config metadata."""
    return lambda record: _record_to_sample(record, config=config)


@task
def sentivent_structured_extraction(
    config: str = "sentivent_unified_uie_sentence",
    split: str = "validation",
) -> Task:
    """Create an Inspect task backed by a SENTiVENT Hugging Face config."""
    dataset = hf_dataset(
        path=DATASET_ID,
        name=config,
        split=split,
        sample_fields=_sample_mapper(config),
    )
    return Task(dataset=dataset, scorer=json_schema())
