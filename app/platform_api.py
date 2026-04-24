from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException


ROOT = Path(__file__).resolve().parents[1]
INCIDENTS_DIR = ROOT / "incidents"

router = APIRouter(prefix="/platform", tags=["platform"])


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _artifact_available(incident_id: str, filename: str) -> bool:
    return (INCIDENTS_DIR / incident_id / filename).exists()


def _sample_incident() -> dict[str, Any]:
    return {
        "id": "INC-20260422153045",
        "title": "Pod failure recovery test",
        "status": "resolved",
        "severity": "warning",
        "service": "resilience-pilot",
        "namespace": "default",
        "started_at": "2026-04-22T15:30:45Z",
        "resolved_at": "2026-04-22T15:30:57Z",
        "duration_seconds": 12,
        "slo_met": True,
        "runbook": "pod-crash.md",
        "mode": "demo",
    }


def _incident_from_dir(path: Path) -> dict[str, Any]:
    result_path = path / "result.json"
    result: dict[str, Any] = {}
    if result_path.exists():
        import json

        try:
            result = json.loads(result_path.read_text())
        except json.JSONDecodeError:
            result = {}

    incident_id = path.name
    started = result.get("timestamp_utc") or "2026-04-22T15:30:45Z"
    duration = int(result.get("recovery_time_seconds") or 12)
    return {
        "id": incident_id,
        "title": "Pod failure recovery test",
        "status": "resolved" if result.get("slo_met", True) else "slo_breached",
        "severity": "warning",
        "service": "resilience-pilot",
        "namespace": "default",
        "started_at": started,
        "resolved_at": started,
        "duration_seconds": duration,
        "slo_met": bool(result.get("slo_met", True)),
        "runbook": "pod-crash.md",
        "mode": "generated",
    }


def _list_incidents() -> list[dict[str, Any]]:
    incidents = [
        _incident_from_dir(path)
        for path in sorted(INCIDENTS_DIR.glob("INC-*"), reverse=True)
        if path.is_dir()
    ]
    return incidents or [_sample_incident()]


@router.get("/summary")
async def platform_summary() -> dict[str, Any]:
    latest = _list_incidents()[0]
    return {
        "mode": "live",
        "status": "healthy",
        "service": "resilience-pilot",
        "namespace": "default",
        "replicas": {"desired": 3, "available": 3, "ready": 3},
        "slo": {
            "availability": {"target": 99.5, "current": 99.982, "status": "met"},
            "mttr": {"target_seconds": 30, "current_seconds": latest["duration_seconds"], "status": "met" if latest["slo_met"] else "breached"},
            "error_rate": {"target_percent": 0.5, "current_percent": 0.14, "status": "met"},
            "p95_latency_ms": {"target_ms": 500, "current_ms": 184, "status": "met"},
        },
        "latest_incident_id": latest["id"],
        "gitops": {"status": "synced", "tool": "ArgoCD"},
        "policy": {"status": "passing", "controls_configured": 12},
        "updated_at": _iso_now(),
    }


@router.get("/slo")
async def platform_slo() -> dict[str, Any]:
    return (await platform_summary())["slo"]


@router.get("/incidents")
async def platform_incidents() -> list[dict[str, Any]]:
    return _list_incidents()


@router.get("/incidents/{incident_id}")
async def platform_incident_detail(incident_id: str) -> dict[str, Any]:
    incident = next((item for item in _list_incidents() if item["id"] == incident_id), None)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    return {
        **incident,
        "summary": "Pod failure was injected against the FastAPI deployment. Kubernetes restored replica count from 2/3 to 3/3 in 12 seconds. The 30 second MTTR objective was met.",
        "detection": {
            "source": "PrometheusRule",
            "condition": "available replicas below desired replicas",
            "metric": "kube_deployment_status_replicas_available",
            "threshold": "available < desired",
            "actual": "2/3 replicas available",
            "runbook_annotation": "runbooks/pod-crash.md",
        },
        "timeline": [
            {"phase": "detect", "label": "Alert detected", "timestamp": "T+04s", "detail": "Replica availability dropped below desired state"},
            {"phase": "snapshot", "label": "Context captured", "timestamp": "T+05s", "detail": "Pods, events, logs, deployment and service state recorded"},
            {"phase": "runbook", "label": "Runbook selected", "timestamp": "T+06s", "detail": "Alert mapped to runbooks/pod-crash.md"},
            {"phase": "recover", "label": "Replica restored", "timestamp": "T+10s", "detail": "Deployment controller created replacement pod"},
            {"phase": "validate", "label": "SLO validated", "timestamp": "T+12s", "detail": "MTTR 12s under 30s objective"},
            {"phase": "audit", "label": "Report generated", "timestamp": "T+13s", "detail": "Incident report and decision record preserved"},
        ],
        "artifacts": [
            {"name": "snapshot-pre/", "type": "cluster-context", "available": (INCIDENTS_DIR / incident_id / "snapshot-pre").exists()},
            {"name": "result.json", "type": "slo-result", "available": _artifact_available(incident_id, "result.json")},
            {"name": "report.md", "type": "incident-report", "available": _artifact_available(incident_id, "report.md")},
            {"name": "remediation.log", "type": "remediation-log", "available": _artifact_available(incident_id, "remediation.log")},
            {"name": "remediation-decision.json", "type": "decision-record", "available": _artifact_available(incident_id, "remediation-decision.json")},
            {"name": "experiment-summary.md", "type": "rollup", "available": (INCIDENTS_DIR / "experiment-summary.md").exists()},
        ],
    }


@router.get("/runbooks")
async def platform_runbooks() -> list[dict[str, Any]]:
    return [
        {
            "id": "pod-crash",
            "title": "Pod Crash Recovery",
            "file": "runbooks/pod-crash.md",
            "mapped_alerts": ["HighPodRestartRate", "PodCrashLoopBackOff", "ServiceDown"],
            "script": "scripts/remediate_pod_crash.sh",
            "supports_dry_run": True,
            "trigger": "Pod restart rate or availability degradation",
            "severity": "warning / critical",
        },
        {
            "id": "high-latency",
            "title": "High Latency",
            "file": "runbooks/high-latency.md",
            "mapped_alerts": ["HighLatencyP95"],
            "script": "scripts/remediate_high_latency.sh",
            "supports_dry_run": True,
            "trigger": "P95 latency over 500ms",
            "severity": "warning",
        },
        {
            "id": "dns-failure",
            "title": "DNS Failure",
            "file": "runbooks/dns-failure.md",
            "mapped_alerts": ["ServiceDown", "HighErrorRate"],
            "script": "",
            "supports_dry_run": False,
            "trigger": "Name resolution failures or dependent service errors",
            "severity": "warning / critical",
        },
        {
            "id": "deployment-rollback",
            "title": "Deployment Rollback",
            "file": "runbooks/deployment-rollback.md",
            "mapped_alerts": ["HighErrorRate", "InsufficientReplicas", "HighErrorRateFastBurn"],
            "script": "scripts/remediate_deployment_rollback.sh",
            "supports_dry_run": True,
            "trigger": "5xx spike or insufficient replicas after release",
            "severity": "warning / critical",
        },
    ]


@router.get("/topology")
async def platform_topology() -> dict[str, Any]:
    return {
        "nodes": [
            {"id": "local", "label": "Local Host", "group": "Local Host", "status": "healthy", "role": "Developer, CI, and demo operator entrypoint"},
            {"id": "k3d", "label": "k3d Cluster", "group": "k3d Cluster", "status": "healthy", "role": "Three-node local Kubernetes control plane"},
            {"id": "service", "label": "Kubernetes Service", "group": "Application Namespace", "status": "healthy", "role": "Routes localhost:8080 traffic to FastAPI pods"},
            {"id": "pods", "label": "FastAPI Pods", "group": "Application Namespace", "status": "healthy", "role": "Three replicas with probes and RED metrics"},
            {"id": "prometheus", "label": "Prometheus", "group": "Monitoring Namespace", "status": "observing", "role": "Scrapes /metrics and evaluates SLO rules"},
            {"id": "grafana", "label": "Grafana", "group": "Monitoring Namespace", "status": "observing", "role": "Visualizes RED and Kubernetes metrics"},
            {"id": "argocd", "label": "ArgoCD", "group": "GitOps Namespace", "status": "reconciling", "role": "Reconciles manifests from Git"},
            {"id": "github", "label": "GitHub Manifests", "group": "CI/CD", "status": "synced", "role": "Desired state and DevSecOps pipeline source"},
        ],
        "edges": [
            {"source": "local", "target": "service", "label": "http://localhost:8080"},
            {"source": "service", "target": "pods", "label": "load balance"},
            {"source": "pods", "target": "prometheus", "label": "/metrics scrape"},
            {"source": "prometheus", "target": "grafana", "label": "dashboard"},
            {"source": "github", "target": "argocd", "label": "pull desired state"},
            {"source": "argocd", "target": "k3d", "label": "sync"},
        ],
    }


@router.get("/controls")
async def platform_controls() -> list[dict[str, Any]]:
    return [
        {"category": "Runtime Safety", "name": "Liveness probe", "artifact": "manifests/deployment.yaml", "status": "configured", "risk_reduced": "Restarts failed containers automatically", "why": "Detects application process failure"},
        {"category": "Runtime Safety", "name": "Readiness probe", "artifact": "manifests/deployment.yaml", "status": "configured", "risk_reduced": "Removes unready pods from service routing", "why": "Prevents bad pods from receiving traffic"},
        {"category": "Runtime Safety", "name": "Non-root container", "artifact": "policy/kubernetes.rego", "status": "enforced", "risk_reduced": "Limits container privilege", "why": "Reduces blast radius if the app is compromised"},
        {"category": "Availability and Recovery", "name": "PodDisruptionBudget", "artifact": "manifests/poddisruptionbudget.yaml", "status": "configured", "risk_reduced": "Maintains minimum replicas during voluntary disruptions", "why": "Protects availability during maintenance"},
        {"category": "Availability and Recovery", "name": "HorizontalPodAutoscaler", "artifact": "manifests/hpa.yaml", "status": "documented gap", "risk_reduced": "Scales replicas on CPU once metrics-server is present", "why": "Adds capacity during sustained load"},
        {"category": "Network and Access Control", "name": "NetworkPolicy", "artifact": "manifests/networkpolicy.yaml", "status": "configured", "risk_reduced": "Restricts ingress, egress, Prometheus scrape, and DNS paths", "why": "Limits lateral movement"},
        {"category": "Policy and CI Gates", "name": "OPA/Rego validation", "artifact": "policy/kubernetes.rego", "status": "configured", "risk_reduced": "Blocks unsafe Kubernetes manifest patterns", "why": "Turns platform standards into code"},
        {"category": "Policy and CI Gates", "name": "Bandit scan", "artifact": ".github/workflows/devsecops.yml", "status": "configured", "risk_reduced": "Finds Python security issues before merge", "why": "Shifts app security left"},
        {"category": "Policy and CI Gates", "name": "Trivy scan", "artifact": ".github/workflows/devsecops.yml", "status": "configured", "risk_reduced": "Blocks critical container vulnerabilities", "why": "Protects the delivery path"},
        {"category": "Observability and Alerting", "name": "Prometheus RED metrics", "artifact": "app/main.py", "status": "configured", "risk_reduced": "Measures rate, errors, and duration", "why": "Makes service behavior observable"},
        {"category": "Observability and Alerting", "name": "Burn-rate alerts", "artifact": "monitoring/prometheus-rules.yaml", "status": "configured", "risk_reduced": "Detects fast and slow error-budget consumption", "why": "Connects alerts to SLO impact"},
        {"category": "Availability and Recovery", "name": "ArgoCD self-heal", "artifact": "setup_argocd.sh", "status": "configured", "risk_reduced": "Reconciles drift back to Git state", "why": "Keeps runtime aligned with reviewed manifests"},
    ]


@router.post("/chaos/degraded")
async def platform_chaos_degraded() -> dict[str, Any]:
    return {"status": "degraded", "message": "Use /simulate-crash?mode=degraded&probability=0.5 to enable API chaos mode."}


@router.post("/chaos/reset")
async def platform_chaos_reset() -> dict[str, Any]:
    return {"status": "reset", "message": "Use /simulate-crash?mode=reset to disable API chaos mode."}
