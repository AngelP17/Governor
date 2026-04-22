# Runbook: Deployment Rollback

## Detection Signals

- **HighErrorRate** alert fires after a recent deployment (warning)
- **InsufficientReplicas** alert fires (warning)
- **ServiceDown** alert fires (critical)
- Spike in HTTP 5xx errors correlated with a deployment event
- Available replicas dropping below desired count

## First Checks

```bash
# Check rollout status
kubectl rollout status deployment/resilience-pilot -n default

# Check revision history
kubectl rollout history deployment/resilience-pilot -n default

# Check current pod status
kubectl get pods -l app=resilience-pilot -n default

# Check recent events
kubectl get events -n default --sort-by='.lastTimestamp' | head -30

# Check current deployment revision
kubectl get deployment resilience-pilot -n default -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}'
```

## Metrics to Review

| Metric | What to look for |
|--------|-----------------|
| `http_requests_total{code=~"5.."}` | Error rate spike |
| `kube_deployment_status_replicas_available` | Available replicas dropping |
| `kube_deployment_status_replicas_unavailable` | Unavailable replicas increasing |
| `kube_deployment_status_replicas_updated` | New replicas failing to become ready |

Check in Prometheus:

```promql
sum(rate(http_requests_total{namespace="default",code=~"5.."}[5m]))
  / sum(rate(http_requests_total{namespace="default"}[5m]))
kube_deployment_status_replicas_available{namespace="default",deployment="resilience-pilot"}
```

## Likely Causes

| Cause | How to identify |
|-------|----------------|
| **Bad image tag** | Pods in `ImagePullBackOff`; events show pull failure |
| **Incompatible config change** | Pods crash on startup; logs show config validation error |
| **Failed migration** | Logs show database migration error; pods fail health checks |
| **Resource limit change** | Pods OOMKilled or CPU throttled after new limits applied |
| **Probe misconfiguration** | Pods start but never become ready; liveness probe fails |

## Remediation

### 1. Confirm the bad deployment

```bash
# Check what changed in the latest revision
kubectl rollout history deployment/resilience-pilot -n default --revision=<latest-revision>
```

### 2. Roll back to the previous revision

```bash
kubectl rollout undo deployment/resilience-pilot -n default
```

To roll back to a specific revision:

```bash
kubectl rollout undo deployment/resilience-pilot -n default --to-revision=<revision-number>
```

### 3. Verify the rollback

```bash
# Check rollout status
kubectl rollout status deployment/resilience-pilot -n default

# Verify pods are running with the previous image
kubectl get pods -l app=resilience-pilot -n default -o jsonpath='{.items[*].spec.containers[0].image}'

# Check pod health
kubectl get pods -l app=resilience-pilot -n default
```

### 4. Check application health

```bash
# Health endpoint
curl -s -o /dev/null -w "%{http_code}" http://<service-endpoint>/health

# Check error rate returning to normal
kubectl logs -l app=resilience-pilot -n default --tail=50 | grep -i "error"
```

## Recovery Criteria

- All replicas available and ready
- Error rate below SLO threshold (below 1% 5xx)
- Health endpoint returning HTTP 200
- No pods restarting or in error state

```bash
# Full recovery verification
kubectl get deployment resilience-pilot -n default
kubectl get pods -l app=resilience-pilot -n default
curl -s -o /dev/null -w "%{http_code}" http://<service-endpoint>/health
```

## Post-Incident

After recovery, investigate the failed deployment:

```bash
# Review the failed revision details
kubectl rollout history deployment/resilience-pilot -n default --revision=<failed-revision>

# Compare with the working revision
kubectl rollout history deployment/resilience-pilot -n default --revision=<working-revision>
```

Document findings and update the deployment checklist if needed.

## Remediation Script

```bash
scripts/remediate_deployment_rollback.sh <INCIDENT_DIR>
```

Dry-run mode (log only, no mutations):

```bash
DRY_RUN=true scripts/remediate_deployment_rollback.sh incidents/INC-xxx
```

The script produces:
- `remediation.log` — append-only log of actions taken
- `remediation-decision.json` — machine-readable decision record

A result of "no action required" is a valid audited outcome.

## Capture Artifacts

```bash
./scripts/capture_incident_snapshot.sh <incident-dir>
```
