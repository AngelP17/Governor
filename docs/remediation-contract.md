# Remediation Script Contract

## Interface

All remediation scripts follow a uniform invocation pattern:

```
scripts/remediate_<scenario>.sh <INCIDENT_DIR>
```

Each script is self-contained, receives an incident directory as its sole positional argument, and produces structured outputs within that directory.

## Required Argument

**INCIDENT_DIR** — Path to a directory containing incident context.

- Must exist on the filesystem as a valid directory.
- Scripts validate this on entry and exit with code 1 if the argument is missing or not a directory.
- The directory typically contains `result.json` (from incident analysis) and will receive `remediation.log` and `remediation-decision.json` as outputs.
- If `result.json` exists, the `incident_id` field is extracted from it; otherwise the directory basename is used.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NAMESPACE` | `default` | Kubernetes namespace containing the target deployment |
| `DEPLOYMENT_NAME` | `governor` | Name of the deployment to remediate |
| `DRY_RUN` | `false` | When `true`, logs intended actions without executing mutating commands |

## Outputs

### remediation.log

Append-only log file at `${INCIDENT_DIR}/remediation.log`. Every action and observation is recorded with a UTC ISO 8601 timestamp. Logs are never overwritten — only appended.

### remediation-decision.json

Structured decision file at `${INCIDENT_DIR}/remediation-decision.json`. Schema:

```json
{
  "incident_id": "string",
  "remediation_script": "string",
  "decision": "no-action | rollout-restart | rollback | dry-run",
  "reason": "string",
  "operator_mode": "live | dry-run",
  "timestamp_utc": "ISO 8601 UTC"
}
```

This file is overwritten on each execution, representing the final decision of the most recent run.

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success — remediation completed, no action required, or dry-run finished |
| 1 | Validation failure — missing or invalid argument |

Scripts never exit with a non-zero code due to a cluster operation failure. Cluster-level errors are captured in the log and decision file; the script itself exits 0 to avoid triggering retry loops in callers that misinterpret non-zero as "needs retry."

## Safety Rules

1. **Validation-first** — All inputs are validated before any cluster interaction occurs.
2. **Idempotent** — Running the script multiple times produces the same result. If the deployment is already healthy, the script exits with `no-action`.
3. **Dry-run support** — Every script supports `DRY_RUN=true` to preview intended actions without mutating the cluster.
4. **No auto-execution from webhooks** — These scripts are designed to be invoked explicitly by an operator or orchestration system, not automatically triggered by Kubernetes webhooks.
5. **All actions logged** — Every kubectl command, check result, and decision is recorded in `remediation.log` with timestamps.
6. **Conservative remediation** — Scripts prefer `no-action` when the cluster state is healthy, even if the incident directory suggests a problem existed previously.

## Dry-Run Behavior

When `DRY_RUN=true`:

- All read-only checks (kubectl get, rollout status, curl health checks) execute normally.
- All mutating operations (kubectl rollout restart, kubectl rollout undo) are replaced with log entries describing the intended action.
- The `remediation-decision.json` is written with `"operator_mode": "dry-run"` and `"decision": "dry-run"`.
- No cluster state is modified.
- The script exits 0.

## Idempotency

Every remediation script is designed to be safely re-run:

- If the deployment is healthy, the script detects this and writes a `no-action` decision.
- Running the script twice in quick succession will not cause duplicate rollouts or rollbacks.
- The `no-action` outcome is a valid, audited result recorded in both the log and decision file.
- The `remediation.log` is append-only, so repeated runs accumulate a full history of observations and decisions.
