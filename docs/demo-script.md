# Demo Script — 3-Minute Interview Walkthrough

## Setup (pre-demo)

Run these commands before the interview starts:

```bash
k3d cluster create resilience-pilot || true
kubectl apply -k k8s/
argocd app sync resilience-pilot
# Port-forwards
kubectl port-forward svc/prometheus-operated 9090:9090 &
kubectl port-forward svc/grafana 3000:3000 &
# Start load generator
kubectl apply -f k8s/load-generator.yaml
```

Verify:

```bash
kubectl get pods -l app=resilience-pilot
```

All 3 pods should show `Running` with `1/1 Ready`.

---

## Minute 0-1: Architecture

**What to say:** "This is a self-healing Kubernetes demo. Three replicas of a stateless app sit behind a Deployment with rolling updates, pod anti-affinity, and security hardening. Prometheus collects metrics, Grafana visualizes them, and ArgoCD handles GitOps delivery."

**What to show:**

```bash
kubectl get pods -o wide
kubectl top pods
argocd app get resilience-pilot
```

**Key talking point:** Demonstrates infrastructure-as-code mindset and production-grade Kubernetes configuration.

---

## Minute 1-2: Chaos Incident

**What to say:** "Now I will inject a pod failure using the chaos monkey script. It picks a random victim, kills it, and tracks how long the cluster takes to recover. It validates the result against a 30-second SLO."

**What to show:**

```bash
./chaos_monkey.sh
```

Wait for output showing recovery time and SLO result. Point out the `INC-*` incident directory that was created.

**Key talking point:** Demonstrates chaos engineering discipline, SLO-driven reliability, and automated MTTR measurement.

---

## Minute 2-2.5: Incident Artifacts

**What to say:** "Every incident generates a full audit trail. Here is the result JSON, a narrative report, and a cluster snapshot captured at the time of failure."

**What to show:**

```bash
ls incidents/INC-*/
cat incidents/INC-*/result.json
cat incidents/INC-*/report.md
ls incidents/INC-*/snapshots/
```

**Key talking point:** Demonstrates incident documentation discipline and the closed-loop artifact chain.

---

## Minute 2.5-3: Alert Webhook + Summary

**What to say:** "Alerts are captured by a webhook receiver that records context without triggering remediation. All remediation is operator-invoked with dry-run support. Let me run the experiment summary."

**What to show:**

```bash
# Quick webhook demo
curl -X POST http://localhost:9100/webhook -H 'Content-Type: application/json' \
  -d '{"alert_name":"HighPodRestartRate","severity":"warning"}'
cat webhook_alerts/alert-context-*.json | tail -1

# Summary
python3 scripts/summarize_experiments.py
```

**Key talking point:** Demonstrates safety-first automation, audit logging, and the full experiment lifecycle.

---

## Closing

**What to say:** "That is the full loop: declarative config, chaos validation, incident capture, operator-gated remediation, and audit trail. The same manifests migrate to EKS with minimal changes."

**Key talking point:** Production readiness and platform portability.
