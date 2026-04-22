# Runbook: Pod Crash / CrashLoopBackOff

## Detection Signals

- **HighPodRestartRate** alert fires (warning)
- **PodCrashLoopBackOff** alert fires (critical)
- Pod status shows `CrashLoopBackOff` or cycles between `Completed` and restarting
- `kube_pod_container_status_restarts_total` increasing rapidly

## First Checks

```bash
# List pods and check status
kubectl get pods -l app=resilience-pilot -n default

# Get detailed pod events and state
kubectl describe pod <pod-name> -n default

# Check recent events in the namespace
kubectl get events -n default --sort-by='.lastTimestamp'
```

## Metrics to Review

| Metric | What to look for |
|--------|-----------------|
| `kube_pod_container_status_restarts_total` | Restart count climbing over time |
| `kube_pod_container_status_last_terminated_reason` | Reason for last termination (OOMKilled, Error, etc.) |
| `kube_pod_container_status_restarts_total` delta over 5m | Rate of restarts |
| `kube_pod_start_time` | How long the pod stayed up before crashing |

Check in Prometheus:

```promql
kube_pod_container_status_last_terminated_reason{namespace="default", pod=~"resilience-pilot.*"}
kube_pod_container_status_restarts_total{namespace="default", pod=~"resilience-pilot.*"}
```

## Likely Causes

| Cause | How to identify |
|-------|----------------|
| **OOMKilled** | Termination reason is `OOMKilled`; `describe pod` shows `Reason: OOMKilled` |
| **Failed liveness probe** | Events show `Liveness probe failed`; termination reason is `Error` |
| **Application startup error** | Container log shows exception/panic before crash |
| **Missing config/secrets** | Events show `configmap/secrets not found` or `var not set` |
| **Image pull failure** | Pod status is `ImagePullBackOff` or `ErrImagePull` |

## Remediation

### 1. Check previous container logs

```bash
kubectl logs <pod-name> --previous -n default
kubectl logs <pod-name> --previous -n default --all-containers
```

### 2. Verify resource limits

```bash
kubectl get pod <pod-name> -n default -o jsonpath='{.spec.containers[*].resources}'
```

If `OOMKilled`, increase memory limit in the deployment manifest or HPA may need to account for memory spikes.

### 3. Check probe configuration

```bash
kubectl get pod <pod-name> -n default -o jsonpath='{.spec.containers[*].livenessProbe}'
```

- Verify `initialDelaySeconds` is long enough for startup
- Verify the probe endpoint is correct and reachable
- Check if `failureThreshold` is too aggressive

### 4. Check configmaps and secrets

```bash
kubectl get configmaps -n default
kubectl get secrets -n default
kubectl describe pod <pod-name> -n default | grep -A5 "Environment"
```

### 5. If image pull failure

```bash
kubectl describe pod <pod-name> -n default | grep -A10 "Events"
```

Verify image tag exists and image pull secrets are configured.

## Recovery Criteria

- Pod is in `Running` state with `Ready=True`
- Restart count has been stable (zero new restarts) for at least 5 minutes
- Health endpoint returns HTTP 200 consistently
- No new `CrashLoopBackOff` events

```bash
# Verify recovery
kubectl get pods -l app=resilience-pilot -n default
kubectl get pods -l app=resilience-pilot -n default -o jsonpath='{.items[*].status.containerStatuses[0].ready}'
curl -s -o /dev/null -w "%{http_code}" http://<service-endpoint>/health
```

## Capture Artifacts

```bash
./scripts/capture_incident_snapshot.sh <incident-dir>
```
