# Sample Artifacts

This directory contains static, curated examples of the artifacts produced by the incident workflow. These are committed to the repository as reviewer-facing references.

Generated incident data lives in `incidents/INC-*/` and is gitignored — only `incidents/.gitkeep` is tracked.

## Files

| File | Source | Description |
|------|--------|-------------|
| `sample-result.json` | `chaos_monkey.sh` | Machine-readable SLO evaluation from a chaos incident |
| `sample-alert-context.json` | `alert_webhook_receiver.py` | Normalized alert metadata from a webhook-captured incident |
| `sample-remediation-decision.json` | `remediate_*.sh` | Remediation decision record with dry-run support |
| `sample-incident-report.md` | `generate_incident_report.py` | Human-readable incident report with SLO verdict |
| `sample-experiment-summary.md` | `summarize_experiments.py` | Cross-incident aggregate summary |

## How These Are Generated

1. Run `./chaos_monkey.sh` to create `incidents/INC-*/result.json`
2. The report generator runs automatically to produce `report.md`
3. Optionally run `scripts/remediate_*.sh <incident-dir>` to add `remediation-decision.json`
4. Send a test alert via `scripts/alert_webhook_receiver.py` to produce `alert-context.json`
5. Run `python3 scripts/summarize_experiments.py` to produce the aggregate summary

## Important

- These are **static examples**, not live data
- Real incident directories are gitignored (`incidents/INC-*`)
- Only `incidents/.gitkeep` is tracked in the repository
