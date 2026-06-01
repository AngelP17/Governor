# 🎯 Kubernetes Reliability Platform - Usage Guide

Complete guide to using your SRE and chaos engineering lab.

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Accessing Services](#accessing-services)
3. [Using Grafana](#using-grafana)
4. [Chaos Engineering](#chaos-engineering)
5. [ArgoCD GitOps](#argocd-gitops)
6. [Troubleshooting](#troubleshooting)

---

## 🔄 Workflow Overview

```mermaid
sequenceDiagram
    participant User
    participant Grafana
    participant LoadGen as Load Generator
    participant Chaos as Chaos Monkey
    participant K8s as Kubernetes
    participant Pods
    participant Artifacts as Incidents Dir

    User->>Grafana: Open dashboard
    User->>LoadGen: Start generate-load.sh
    LoadGen->>Pods: Continuous HTTP requests
    Pods-->>Grafana: Metrics via Prometheus
    
    User->>Chaos: Run chaos_monkey.sh
    Chaos->>K8s: Delete random pod
    K8s-->>Pods: Pod terminated
    Grafana-->>User: Shows pod count drop
    K8s->>Pods: Create new pod (self-heal)
    Grafana-->>User: Shows recovery
    Chaos->>Artifacts: Write incident dir (snapshots, result.json, report.md)
    
    Note over User,Pods: MTTR target: < 30 seconds
```

---

## 🚀 Quick Start

### Start Port Forwards
```bash
# Grafana (Monitoring)
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Application
kubectl port-forward -n default svc/governor 8080:8000

# ArgoCD (Optional)
kubectl port-forward -n argocd svc/argocd-server 8443:443
```

### Generate Load for Metrics
```bash
# Run the load generator in a terminal
./generate-load.sh
```

### Run Chaos Experiment
```bash
# In another terminal
./chaos_monkey.sh
```

> **Note**: `demo-chaos.sh` is deprecated in favor of `chaos_monkey.sh`.

---

## 🌐 Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Application** | http://localhost:8080 | N/A |
| **Grafana** | http://localhost:3000 | admin / admin |
| **ArgoCD** | https://localhost:8443 | admin / (see below) |
| **Prometheus** | Port-forward on 9090 | N/A |

### Get ArgoCD Password
```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

---

## 📊 Using Grafana

### 1. Login to Grafana
- Open http://localhost:3000
- Username: `admin`
- Password: `admin`
- Skip password change (or change if you prefer)

### 2. Find Your Dashboard
1. Click the hamburger menu (☰) on the left
2. Navigate to **Dashboards**
3. Click on **Governor Dashboard**

### 3. Understanding the Panels

#### Request Rate
Shows HTTP requests per second. You need to generate load to see data:
```bash
./generate-load.sh
```

#### Error Rate
Displays the percentage of failed requests. Normally should be 0%.

#### Response Time (Latency)
- **P50**: 50% of requests are faster than this
- **P95**: 95% of requests are faster than this
- **P99**: 99% of requests are faster than this

#### Pod Status
Shows number of running pods. Should be 3 normally.
Watch this during chaos experiments!

#### Chaos Events
Records when pods are killed by the chaos monkey or manually deleted.

### 4. Time Range
- Top right corner: Select time range
- For live testing: Use **Last 5 minutes** with auto-refresh
- Click the refresh icon to set auto-refresh (e.g., every 5s)

### 5. Variables
Some dashboards have variables at the top:
- **Pod**: Select specific pod to view
- **Namespace**: Filter by namespace (default: default)

---

## 🔥 Chaos Engineering

### Understanding Resilience
The app has 3 replicas with:
- **Health probes**: K8s kills unhealthy pods
- **Readiness probes**: K8s stops sending traffic to starting pods
- **Anti-affinity**: Spreads pods across different nodes

### Experiment 1: Manual Pod Deletion
```bash
# Kill a random pod
kubectl delete pod -l app=governor --grace-period=0 --force

# Watch recovery
watch kubectl get pods -l app=governor
```

**Expected Result**:
- Pod is killed
- New pod starts within ~2 seconds
- Pod becomes ready in ~8 seconds
- No user-facing downtime (other 2 pods still serving)

### Experiment 2: Automated Chaos Demo
```bash
./chaos_monkey.sh
```

This script:
1. Shows current pod status
2. Captures a pre-incident snapshot of cluster state
3. Kills a random pod
4. Monitors recovery for 30 seconds
5. Captures a post-incident snapshot
6. Evaluates SLO compliance and generates incident artifacts

After running, an `incidents/INC-*` directory is created containing:
- **snapshot-pre/** / **snapshot-post/** — Cluster state before and after
- **result.json** — SLO evaluation with MTTR measurement
- **report.md** — Human-readable incident report

> **Note**: `demo-chaos.sh` is deprecated. Use `chaos_monkey.sh` for full incident artifact capture.

**Watch in Grafana**:
- Open Grafana dashboard before running
- Set time range to "Last 5 minutes" with 5s auto-refresh
- Run the script
- Observe:
  - Pod count drops from 3 to 2, then back to 3
  - Brief spike in response time (if any)
  - No increase in error rate (the 2 healthy pods handle traffic)

### Experiment 3: Sustained Load During Chaos
```bash
# Terminal 1: Generate continuous load
./generate-load.sh

# Terminal 2: Delete pods repeatedly
for i in {1..5}; do
  echo "Chaos round $i"
  kubectl delete pod -l app=governor --grace-period=0 --force
  sleep 15
done
```

**Watch**:
- Grafana dashboard showing metrics during chaos
- Request rate stays constant
- Error rate should remain low (< 1%)
- Response time may spike briefly

### Incident Artifacts

Every `chaos_monkey.sh` run produces a timestamped incident directory under `incidents/`.

#### Directory Structure
```
incidents/
└── INC-20260422-143052/
    ├── result.json          # SLO evaluation data
    ├── report.md            # Human-readable incident report
    ├── snapshot-pre/        # Pre-recovery cluster context
    │   ├── pods.txt
    │   ├── events.txt
    │   └── ...
    └── snapshot-post/       # Post-recovery cluster context
        ├── pods.txt
        ├── events.txt
        └── ...
```

#### Reading result.json
The `result.json` file contains the machine-readable SLO evaluation:

| Field | Description |
|-------|-------------|
| `incident_id` | Unique incident identifier (e.g., `INC-20260422-143052`) |
| `failure_type` | Failure injected by the experiment |
| `recovery_time_seconds` | Measured Mean Time To Recovery |
| `slo_target_seconds` | SLO threshold (default: 30) |
| `slo_met` | `true` if MTTR is within target |
| `victim_pod` | Name of the terminated pod |
| `timestamp_utc` | ISO 8601 UTC incident timestamp |

#### Reading report.md
The `report.md` file is a human-readable summary containing:
- Incident metadata and SLO evaluation
- Pre and post recovery pod state excerpts
- Runbook reference for remediation
- Generation timestamp for auditability

#### How Snapshots Work
`scripts/capture_incident_snapshot.sh` collects cluster context at a point in time:
- Pod list with statuses and restart counts
- Deployment and ReplicaSet state
- Node resource usage
- Recent events from the namespace
- Application logs and pod descriptions

These snapshots enable before/after comparison and post-incident review.

### Measuring MTTR (Mean Time To Recovery)
```bash
# Time how long until pod is ready
time (kubectl delete pod -l app=governor --grace-period=0 --force && \
      kubectl wait --for=condition=ready pod -l app=governor --timeout=60s)
```

**Target**: Recovery in < 10 seconds

---

## 🔄 ArgoCD GitOps

### Access ArgoCD
```bash
# Start port-forward
kubectl port-forward -n argocd svc/argocd-server 8443:443

# Get password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo

# Open browser
open https://localhost:8443
```

### What You'll See
- **Application**: governor
- **Status**: Healthy and Synced
- **Auto-Sync**: Enabled (watches Git repo)
- **Self-Heal**: Enabled (auto-corrects drift)

### Testing GitOps
When CI/CD pushes a new image:
1. GitHub Actions updates `manifests/deployment.yaml`
2. Commits to Git with new image SHA
3. ArgoCD detects the change within ~3 minutes
4. ArgoCD triggers rolling update
5. Pods are replaced one-by-one (zero downtime)

### Manual Sync
If you make manual changes to manifests:
```bash
# Trigger sync immediately
kubectl -n argocd patch app governor \
  --type merge -p '{"metadata":{"annotations":{"argocd.argoproj.io/refresh":"true"}}}'
```

---

## 🐛 Troubleshooting

### Grafana Shows No Data

**Problem**: Empty graphs in Grafana

**Solutions**:
1. Generate load:
   ```bash
   ./generate-load.sh
   ```

2. Check Prometheus is scraping:
   ```bash
   kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
   # Open http://localhost:9090
   # Go to Status → Targets
   # Find "governor" - should be UP
   ```

3. Verify ServiceMonitor:
   ```bash
   kubectl get servicemonitor governor -o yaml
   ```

### Port Forward Keeps Dying

**Problem**: `port-forward` stops working

**Solutions**:
1. Check if process is running:
   ```bash
   ps aux | grep port-forward
   ```

2. Restart it:
   ```bash
   # Kill old ones
   pkill -f "port-forward.*grafana"

   # Start new one
   kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
   ```

3. Use a background script:
   ```bash
   nohup kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 &
   ```

### Application Not Responding

**Problem**: Can't reach http://localhost:8080

**Check pods**:
```bash
kubectl get pods -l app=governor
kubectl logs -l app=governor --tail=50
```

**Check service**:
```bash
kubectl get svc governor
kubectl describe svc governor
```

**Restart port-forward**:
```bash
kubectl port-forward svc/governor 8080:8000
```

### Chaos Experiments Show No Impact

**Problem**: Deleting pods doesn't show in metrics

**Why**: You need **active load** to see the impact:
```bash
# Generate load BEFORE running chaos
./generate-load.sh &

# Then run chaos
./chaos_monkey.sh
```

> **Note**: `demo-chaos.sh` is deprecated. Use `chaos_monkey.sh` for incident artifact capture.

### CI/CD Pipeline Failing

**Check recent runs**:
```bash
# If you have gh CLI
gh run list --limit 5

# View specific run
gh run view <run-id>
```

**Common issues**:
- Missing Docker Hub secrets
- Trivy found CRITICAL vulnerabilities
- GitOps update permission issues

### ArgoCD Out of Sync

**Problem**: ArgoCD shows "OutOfSync"

**Fix**:
```bash
# Manual sync
kubectl -n argocd patch app governor \
  --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{"revision":"HEAD"}}}'

# Or use ArgoCD CLI
argocd app sync governor
```

---

## 📈 Best Practices for Demo

### Preparing for a Demo

1. **Start Everything**:
   ```bash
   # Terminal 1: Grafana
   kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

   # Terminal 2: Application
   kubectl port-forward svc/governor 8080:8000

   # Terminal 3: Load generator
   ./generate-load.sh
   ```

2. **Open Browser Tabs**:
   - Grafana: http://localhost:3000
   - Application: http://localhost:8080/health
   - GitHub Actions: https://github.com/YourUsername/governor/actions

3. **Set Grafana Time Range**:
   - Last 5 minutes
   - Auto-refresh: 5 seconds

4. **Wait 2-3 minutes** for metrics to populate

### During Demo

1. **Show Application Health**:
   - Open http://localhost:8080/health
   - Point out 3 healthy pods

2. **Show Metrics**:
   - Open Grafana dashboard
   - Explain each panel

3. **Run Chaos Experiment**:
    - Run `./chaos_monkey.sh`
    - Watch Grafana dashboard
    - Show how quickly it recovers
    - Review the incident artifacts in `incidents/INC-*`

4. **Show GitOps**:
   - Show recent GitHub Actions run
   - Show ArgoCD UI
   - Explain auto-sync

---

## 🎓 Learning Objectives Demonstrated

✅ **Site Reliability Engineering**
- Multi-replica deployments for high availability
- Health and readiness probes
- Anti-affinity for fault tolerance
- Observability with Prometheus + Grafana

✅ **Chaos Engineering**
- Controlled failure injection
- MTTR measurement
- Resilience testing
- No single point of failure

✅ **DevSecOps**
- Security scanning (Bandit, Trivy)
- Security gates in CI/CD
- Shift-left security

✅ **GitOps**
- Declarative infrastructure
- Git as single source of truth
- Automated deployments
- Self-healing applications

✅ **Observability**
- RED metrics (Rate, Errors, Duration)
- Custom Grafana dashboards
- Prometheus scraping
- Alert rules (optional)

---

## 🔗 Useful Commands

```bash
# View all resources
kubectl get all -n default
kubectl get all -n monitoring
kubectl get all -n argocd

# Check logs
kubectl logs -l app=governor -f --tail=100

# Describe resources
kubectl describe deployment governor
kubectl describe svc governor

# Port forwards (all in one)
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 &
kubectl port-forward svc/governor 8080:8000 &

# Clean up port forwards
pkill -f port-forward

# Force pod restart (chaos)
kubectl rollout restart deployment governor

# Scale replicas
kubectl scale deployment governor --replicas=5

# Watch pod status (live updates)
watch -n 1 kubectl get pods -l app=governor
```

---

## 📚 Additional Resources

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [ArgoCD Docs](https://argo-cd.readthedocs.io/)
- [Chaos Engineering Principles](https://principlesofchaos.org/)
- [SRE Book](https://sre.google/books/)

---

**Need Help?** Check the main [README.md](README.md) or open an issue on GitHub.
