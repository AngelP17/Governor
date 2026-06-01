# Runbook: DNS Resolution Failures

## Detection Signals

- Application logs show errors containing "name resolution", "no such host", or "NXDOMAIN"
- **ServiceDown** or **HighErrorRate** alert fires as a side effect
- Intermittent or persistent connection failures to services by name

## First Checks

```bash
# Check application pod status
kubectl get pods -l app=governor -n default

# Check CoreDNS pods
kubectl get pods -l k8s-app=kube-dns -n kube-system

# Test DNS resolution from inside the cluster
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup governor.default.svc.cluster.local

# Test external DNS
kubectl run dns-test-ext --image=busybox:1.36 --rm -it --restart=Never -- nslookup google.com
```

## Metrics to Review

| Metric | What to look for |
|--------|-----------------|
| `coredns_dns_requests_total` | Overall DNS request rate |
| `coredns_dns_responses_total` | Error responses (SERVFAIL, NXDOMAIN) |
| `coredns_cache_hits_total` | Cache hit ratio dropping |
| `coredns_panics_total` | CoreDNS panics or crashes |

Check in Prometheus:

```promql
sum(rate(coredns_dns_responses_total{rcode="servfail"}[5m]))
sum(rate(coredns_dns_requests_total{}[5m]))
```

If CoreDNS metrics are not available, check pod logs:

```bash
kubectl logs -l k8s-app=kube-dns -n kube-system --tail=100
```

## Likely Causes

| Cause | How to identify |
|-------|----------------|
| **CoreDNS pod crash** | `kubectl get pods -l k8s-app=kube-dns -n kube-system` shows CrashLoopBackOff or 0/1 |
| **Network policy blocking DNS** | DNS works from some pods but not others; recent NetworkPolicy changes |
| **Stub domain misconfiguration** | External DNS fails but internal works, or vice versa |
| **Node DNS issues** | DNS fails from pods on specific nodes; check `/etc/resolv.conf` on nodes |
| **CoreDNS resource exhaustion** | CoreDNS pods under CPU/memory pressure; high request rate |

## Remediation

### 1. Restart CoreDNS pods if crashed

```bash
kubectl rollout restart deployment coredns -n kube-system
```

Or delete pods to force rescheduling:

```bash
kubectl delete pods -l k8s-app=kube-dns -n kube-system
```

### 2. Check network policies

```bash
kubectl get networkpolicies -n default
kubectl get networkpolicies -n kube-system
```

DNS uses port 53 UDP/TCP. Ensure no network policy blocks egress to `kube-dns` service on port 53:

```bash
# Verify DNS service endpoint
kubectl get svc kube-dns -n kube-system
```

### 3. Verify pod resolv.conf

```bash
kubectl exec <pod-name> -n default -- cat /etc/resolv.conf
```

Expected output should include:

```
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
```

If `nameserver` is incorrect or `ndots` is misconfigured, check the pod spec or cluster DNS config:

```bash
kubectl get pod <pod-name> -n default -o jsonpath='{.spec.dnsPolicy}'
kubectl get pod <pod-name> -n default -o jsonpath='{.spec.dnsConfig}'
```

### 4. Check CoreDNS ConfigMap

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

Verify stub domains, upstream nameservers, and plugins are correctly configured.

### 5. Check node-level DNS

If DNS fails only on specific nodes:

```bash
kubectl get nodes -o wide
# SSH to the affected node and check
cat /etc/resolv.conf
```

## Recovery Criteria

- DNS queries resolve successfully from inside the cluster
- Application pods healthy with no "name resolution" errors in logs
- CoreDNS pods running and ready

```bash
# Verify DNS resolution
kubectl run dns-verify --image=busybox:1.36 --rm -it --restart=Never -- nslookup governor.default.svc.cluster.local

# Verify application health
kubectl get pods -l app=governor -n default
curl -s -o /dev/null -w "%{http_code}" http://<service-endpoint>/health
```

## Remediation Script

```bash
scripts/remediate_pod_crash.sh <INCIDENT_DIR>
```

Dry-run mode (log only, no mutations):

```bash
DRY_RUN=true scripts/remediate_pod_crash.sh incidents/INC-xxx
```

The script produces:
- `remediation.log` — append-only log of actions taken
- `remediation-decision.json` — machine-readable decision record

A result of "no action required" is a valid audited outcome.

## Capture Artifacts

```bash
./scripts/capture_incident_snapshot.sh <incident-dir>
```
