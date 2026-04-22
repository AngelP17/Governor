# Post-Incident Review: [INCIDENT_ID]

**Date:** YYYY-MM-DD
**Severity:** critical | warning
**Incident ID:** INC-XXXXXXXX
**Duration:** X minutes
**Detection:** alert | manual | chaos experiment
**SLO Met:** yes | no

---

## Summary

One-paragraph description of what happened.

## Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | First alert / detection |
| HH:MM | Incident confirmed |
| HH:MM | Remediation started |
| HH:MM | Service recovered |
| HH:MM | Incident closed |

## Customer Impact

- Duration of degraded service:
- Percentage of requests affected:
- Number of users impacted:

## Detection

- How was the incident detected?
- Which alert fired?
- Time from onset to detection:

## Root Cause

Technical explanation of the underlying cause.

## Contributing Factors

- Factor 1
- Factor 2
- Factor 3

## Remediation

What actions were taken to resolve the incident?

### Artifacts

- Incident directory: `incidents/[INCIDENT_ID]/`
- Result JSON: `incidents/[INCIDENT_ID]/result.json`
- Incident report: `incidents/[INCIDENT_ID]/report.md`
- Remediation decision: `incidents/[INCIDENT_ID]/remediation-decision.json`

## Prevention

What changes will prevent recurrence?

| Action | Owner | Status |
|--------|-------|--------|
| | | |

## Follow-Up Actions

| Action | Owner | Due Date |
|--------|-------|----------|
| | | |

## Lessons Learned

What did we learn from this incident?
