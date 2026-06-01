# Runbook: High Latency (P95 > 500ms)

## Detection Signals

- **HighLatencyP95** alert fires (warning)
- P95 latency on the health or request endpoint exceeds 500ms
- Users report slow responses or timeouts

## First Checks

```bash
# Check pod status and readiness
kubectl get pods -l app=governor -n default

# Check pod resource usage
kubectl top pods -l app=governor -n default

# Check for pending or throttled requests
kubectl get pods -l app=governor -n default -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")]}'
```

## Metrics to Review

| Metric | What to look for |
|--------|-----------------|
| `http_request_duration_seconds` histogram | P95/P99 latency trends |
| `http_request_duration_seconds_count` | Request volume spike |
| `container_cpu_usage_seconds_total` | CPU near limit |
| `container_memory_working_set_bytes` | Memory near limit |
| `kube_pod_container_resource_limits` | Current configured limits |

Check in Prometheus:

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace="default"}[5m])) by (le))
container_cpu_usage_seconds_total{namespace="default", pod=~"governor.*"}
container_memory_working_set_bytes{namespace="default", pod=~"governor.*"}
```

## Likely Causes

| Cause | How to identify |
|-------|----------------|
| **Resource throttling** | CPU usage at or above limit; pod under heavy CPU pressure |
| **Slow downstream dependency** | Correlation with increased latency on external service calls in logs |
| **Large payloads** | High request/response sizes; `content-length` in logs |
| **Garbage collection pauses** | Application logs show GC events; memory usage near limit |
| **Insufficient replicas** | Request per pod ratio high; HPA not scaled out |

## Remediation

### 1. Review resource requests and limits

```bash
kubectl get deployment governor -n default -o jsonpath='{.spec.template.spec.containers[0].resources}'
```

If CPU is throttled, increase CPU limit or adjust requests for better scheduling.

### 2. Check HPA settings and current scaling

```bash
kubectl get hpa -n default
kubectl describe hpa -n default
```

Verify HPA is configured and has room to scale. Check if maxReplicas is too low.

### 3. Review application logs for slow queries or operations

```bash
kubectl logs -l app=governor -n default --tail=200 | grep -i "slow\|timeout\|latency\|elapsed"
```

### 4. Check downstream dependency health

```bash
# If using a database or external service, check connectivity
kubectl exec -it <pod-name> -n default -- curl -s -o /dev/null -w "%{http_code}" <downstream-url>
```

### 5. Check for memory pressure and GC

```bash
kubectl top pods -l app=governor -n default
kubectl logs -l app=governor -n default --tail=200 | grep -i "gc\|oom\|memory"
```

If GC pauses are frequent, increase memory limit or tune GC parameters.

## Recovery Criteria

- P95 latency below 500ms for 5 consecutive minutes
- No alerts firing
- Resource utilization within normal bounds

```bash
# Verify recovery via Prometheus query or health endpoint
curl -s -o /dev/null -w "%{http_code}\n" http://<service-endpoint>/health
```

Check the Grafana latency dashboard for the P95 graph returning to normal.

## Remediation Script

```bash
scripts/remediate_high_latency.sh <INCIDENT_DIR>
```

Dry-run mode (log only, no mutations):

```bash
DRY_RUN=true scripts/remediate_high_latency.sh incidents/INC-xxx
```

The script produces:
- `remediation.log` — append-only log of actions taken
- `remediation-decision.json` — machine-readable decision record

A result of "no action required" is a valid audited outcome.

## Capture Artifacts

```bash
./scripts/capture_incident_snapshot.sh <incident-dir>
```
