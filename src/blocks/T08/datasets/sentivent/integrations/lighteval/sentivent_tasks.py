# Copyright (c) Gilles Jacobs.
# SPDX-License-Identifier: Apache-2.0

"""LightEval starter task declarations for SENTiVENT."""

from __future__ import annotations

HF_REPO = "GillesJacobs/sentivent"
TASK_CONFIGS = ["sentivent_unified_uie_sentence"]


def prompt_fn(line: dict[str, object], task_name: str | None = None) -> str:
    """Build a generation prompt from a SENTiVENT task row."""
    del task_name
    return (
        "Extract SENTiVENT economic events and implicit sentiment in UIE "
        f"spot-association format.\n\nInput:\n{line['text']}"
    )
