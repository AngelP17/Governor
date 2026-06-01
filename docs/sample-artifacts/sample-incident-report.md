# Incident Report: INC-20260422153045

## Metadata

| Field | Value |
|-------|-------|
| Incident ID | `INC-20260422153045` |
| Failure Type | `pod-termination` |
| Victim Pod | `governor-7d8f9c6b5-x2k4p` |
| Timestamp (UTC) | `2026-04-22T15:30:45Z` |

## SLO Evaluation

| Metric | Value |
|--------|-------|
| Recovery Time | 11s |
| SLO Target | 30s |
| SLO Met | **PASS** |

## Pre-Recovery State

```
NAME                                  READY   STATUS        RESTARTS   AGE
governor-7d8f9c6b5-x2k4p     1/1     Terminating   0          5m
governor-7d8f9c6b5-m9n2q     1/1     Running       0          5m
governor-7d8f9c6b5-p7j3r     1/1     Running       0          5m
```

## Post-Recovery State

```
NAME                                  READY   STATUS        RESTARTS   AGE
governor-7d8f9c6b5-a4b1c     1/1     Running       0          8s
governor-7d8f9c6b5-m9n2q     1/1     Running       0          5m
governor-7d8f9c6b5-p7j3r     1/1     Running       0          5m
```

## Remediation Summary

| Field | Value |
|-------|-------|
| Script | `remediate_pod_crash.sh` |
| Decision | `no-action` |
| Reason | All pods healthy after self-healing |
| Mode | `live` |

## Runbook Reference

See [runbooks/pod-crash.md](../runbooks/pod-crash.md) for remediation steps.

---
_Report generated at 2026-04-22T15:31:00Z_
