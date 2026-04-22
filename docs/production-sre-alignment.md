# Production SRE Alignment

## Architecture Summary

This project implements a self-healing Kubernetes resilience pilot on a local k3d cluster. The architecture comprises:

- **k3d cluster** running a stateless demo application deployed as a 3-replica Deployment
- **Prometheus + Grafana** for metrics collection, dashboards, and SLO-based alerting
- **ArgoCD** for GitOps-driven continuous delivery
- **Chaos engineering** via `chaos_monkey.sh`, which injects pod failures and tracks recovery
- **Closed-loop incident workflow**: chaos injection, incident detection, snapshot capture, remediation decision, and audit trail generation

All configurations are declarative, version-controlled, and reproducible.

## Production-Readiness Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Health probes (liveness + readiness) | Implemented | HTTP GET probes on `/healthz` and `/readyz` endpoints |
| Anti-affinity pod scheduling | Implemented | Preferred soft anti-affinity across topology keys |
| Resource requests and limits | Implemented | CPU and memory bounds set on all containers |
| Rolling update strategy (maxSurge=1, maxUnavailable=0) | Implemented | Zero-downtime rolling updates enforced |
| Non-root container security | Implemented | `runAsNonRoot: true`, `runAsUser: 1000` |
| Read-only root filesystem | Implemented | `readOnlyRootFilesystem: true` with tmpfs writes |
| Capability dropping (ALL) | Implemented | `drop: ["ALL"]` in security context |
| SLO-based alerting (6 rules) | Implemented | Prometheus alert rules for restart rate, availability, latency, etc. |
| Runbook coverage (4 runbooks) | Implemented | Pod crash, high restart rate, crashloop, SLO breach runbooks |
| Remediation scripts with dry-run | Implemented | All remediation scripts support `DRY_RUN=true` |
| Incident artifact audit trail | Implemented | `result.json`, `report.md`, snapshots per incident |
| GitOps delivery via ArgoCD | Implemented | Application synced from Git, automated drift detection |

## Platform Role Alignment

| SRE Role | Lab Implementation |
|----------|-------------------|
| Incident Response | Closed-loop workflow: inject failure, detect, capture artifacts, remediate, review |
| Observability | Prometheus metrics collection, Grafana dashboards, 6 alert rules |
| Chaos Engineering | `chaos_monkey.sh` with pod termination, MTTR tracking, SLO validation |
| Runbook Operations | 4 runbooks covering common failure modes, alert-runbook mapping |
| Remediation Automation | Scripts with dry-run mode, decision records, operator-invoked execution |
| Post-Incident Review | `report.md` and `result.json` per incident, append-only audit trail |

## AWS/EKS Migration Rationale

This lab is designed as a portable foundation for production deployment. The migration path to AWS/EKS is documented in [docs/aws-deployment-plan.md](aws-deployment-plan.md). Key rationale includes:

- k3d manifests transfer directly to EKS with minimal modification
- ArgoCD configuration is cloud-agnostic and re-targets EKS via kubeconfig
- Prometheus and Grafana deployments map to managed offerings (Amazon Managed Prometheus, Amazon Managed Grafana)
- Security policies (non-root, read-only filesystem, capability drops) carry forward unchanged
- The closed-loop incident workflow is platform-independent

## Remediation Safety Model

This project enforces a strict safety model for all remediation actions:

1. **Operator-invoked, not automatic.** Remediation scripts are executed by a human operator. No script triggers autonomously from alerts.
2. **Webhook receiver is capture-only.** The alert webhook receiver (`alert_webhook_receiver.py`) records alert context as JSON artifacts. It does not execute remediation.
3. **All remediation supports `DRY_RUN=true`.** Every remediation script accepts a `DRY_RUN` environment variable that logs intended actions without executing them.
4. **All actions produce append-only audit logs.** Every remediation decision, whether action taken or not, is recorded in a JSON decision file with a timestamp.
5. **"No action required" is a valid, audited outcome.** If the system has already self-healed, the remediation script records `no-action` with the reason. This is the expected outcome for most pod-termination incidents in a healthy cluster.

## Limitations and Next Steps

This section provides an honest assessment of the current lab scope.

**Limitations:**

- **Local-only.** Runs on a single-machine k3d cluster. Not distributed across regions or availability zones.
- **No TLS.** All service communication is plaintext HTTP. No ingress TLS termination.
- **No authentication.** No RBAC, no OIDC integration, no API gateway auth. Grafana and Prometheus are exposed without login.
- **No scheduling.** Chaos experiments are run manually. No scheduled or continuous chaos validation.
- **No ticketing integration.** Incidents are tracked as filesystem artifacts. No integration with Jira, PagerDuty, or similar systems.
- **Single-cluster.** No multi-cluster federation, no cross-cluster failover, no global load balancing.

**Next Steps:**

- Migrate to AWS/EKS with managed node groups and ALB ingress
- Add TLS via cert-manager and Let's Encrypt
- Implement OIDC authentication via Dex or EKS native IAM
- Integrate with PagerDuty or Opsgenie for alert routing and on-call management
- Add scheduled chaos validation via CronJob
- Explore multi-cluster topology with KubeFed or similar
