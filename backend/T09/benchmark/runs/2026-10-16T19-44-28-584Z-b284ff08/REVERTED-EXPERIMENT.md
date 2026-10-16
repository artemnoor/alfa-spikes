# Reverted JEV prompt experiment

This one case tested a shorter relation rubric. It incorrectly classified a factory launch as `SAME` with the earlier loan, which would merge two distinct project actions.

That rubric was reverted. The final prompt explicitly says project actions are distinct and classifies them as `RELATED` only when the text states their direct link. The follow-up live smoke test with that rule returned `RELATED`: [`RESULTS.md`](../2026-10-16T19-51-19-414Z-edde1038/RESULTS.md).

The experiment cost 0.1057 ₽ in reported JEV usage. It is retained to record why the apparently cheaper rubric was rejected.
