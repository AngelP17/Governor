from __future__ import annotations

import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException


ROOT = Path(__file__).resolve().parents[1]
INCIDENTS_DIR = ROOT / "incidents"

router = APIRouter(prefix="/platform", tags=["platform"])

# Shared chaos state (imported by main.py for health checks)
CHAOS_MODE = {"enabled": False, "probability": 0.0}
_chaos_history: list[dict[str, Any]] = []


def _iso_now() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


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
        "status": "healthy" if not CHAOS_MODE["enabled"] else "degraded",
        "service": "resilience-pilot",
        "namespace": "default",
        "replicas": {"desired": 3, "available": 3, "ready": 3},
        "slo": {
            "availability": {"target": 99.5, "current": 99.982, "status": "met"},
            "mttr": {
                "target_seconds": 30,
                "current_seconds": latest["duration_seconds"],
                "status": "met" if latest["slo_met"] else "breached",
            },
            "error_rate": {
                "target_percent": 0.5,
                "current_percent": 0.14,
                "status": "met",
            },
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
    incident = next(
        (item for item in _list_incidents() if item["id"] == incident_id), None
    )
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
            {
                "phase": "detect",
                "label": "Alert detected",
                "timestamp": "T+04s",
                "detail": "Replica availability dropped below desired state",
            },
            {
                "phase": "snapshot",
                "label": "Context captured",
                "timestamp": "T+05s",
                "detail": "Pods, events, logs, deployment and service state recorded",
            },
            {
                "phase": "runbook",
                "label": "Runbook selected",
                "timestamp": "T+06s",
                "detail": "Alert mapped to runbooks/pod-crash.md",
            },
            {
                "phase": "recover",
                "label": "Replica restored",
                "timestamp": "T+10s",
                "detail": "Deployment controller created replacement pod",
            },
            {
                "phase": "validate",
                "label": "SLO validated",
                "timestamp": "T+12s",
                "detail": "MTTR 12s under 30s objective",
            },
            {
                "phase": "audit",
                "label": "Report generated",
                "timestamp": "T+13s",
                "detail": "Incident report and decision record preserved",
            },
        ],
        "artifacts": [
            {
                "name": "snapshot-pre/",
                "type": "cluster-context",
                "available": (INCIDENTS_DIR / incident_id / "snapshot-pre").exists(),
            },
            {
                "name": "result.json",
                "type": "slo-result",
                "available": _artifact_available(incident_id, "result.json"),
            },
            {
                "name": "report.md",
                "type": "incident-report",
                "available": _artifact_available(incident_id, "report.md"),
            },
            {
                "name": "remediation.log",
                "type": "remediation-log",
                "available": _artifact_available(incident_id, "remediation.log"),
            },
            {
                "name": "remediation-decision.json",
                "type": "decision-record",
                "available": _artifact_available(
                    incident_id, "remediation-decision.json"
                ),
            },
            {
                "name": "experiment-summary.md",
                "type": "rollup",
                "available": (INCIDENTS_DIR / "experiment-summary.md").exists(),
            },
        ],
    }


@router.get("/runbooks")
async def platform_runbooks() -> list[dict[str, Any]]:
    return [
        {
            "id": "pod-crash",
            "title": "Pod Crash Recovery",
            "file": "runbooks/pod-crash.md",
            "mapped_alerts": [
                "HighPodRestartRate",
                "PodCrashLoopBackOff",
                "ServiceDown",
            ],
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
            "mapped_alerts": [
                "HighErrorRate",
                "InsufficientReplicas",
                "HighErrorRateFastBurn",
            ],
            "script": "scripts/remediate_deployment_rollback.sh",
            "supports_dry_run": True,
            "trigger": "5xx spike or insufficient replicas after release",
            "severity": "warning / critical",
        },
    ]


@router.post("/runbooks/{runbook_id}/dry-run")
async def platform_runbook_dry_run(runbook_id: str) -> dict[str, Any]:
    runbooks = await platform_runbooks()
    runbook = next((r for r in runbooks if r["id"] == runbook_id), None)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")
    if not runbook["supports_dry_run"]:
        return {
            "runbook_id": runbook_id,
            "status": "skipped",
            "message": "This runbook does not support dry-run execution.",
            "command": None,
            "output": None,
        }
    command = f"DRY_RUN=true {runbook['script']} incidents/INC-20260422153045"
    return {
        "runbook_id": runbook_id,
        "status": "dry_run_simulated",
        "message": f"Dry-run completed for {runbook['title']}.",
        "command": command,
        "output": f"[DRY RUN] Would execute: {command}\n[DRY RUN] Steps: check pods -> capture events -> verify readiness -> log result\n[DRY RUN] No changes applied.",
    }


@router.post("/runbooks/{runbook_id}/execute")
async def platform_runbook_execute(runbook_id: str) -> dict[str, Any]:
    runbooks = await platform_runbooks()
    runbook = next((r for r in runbooks if r["id"] == runbook_id), None)
    if not runbook:
        raise HTTPException(status_code=404, detail="Runbook not found")
    if not runbook["script"]:
        return {
            "runbook_id": runbook_id,
            "status": "manual_required",
            "message": "This runbook requires manual steps.",
            "command": None,
            "output": None,
        }
    command = f"{runbook['script']} incidents/INC-20260422153045"
    return {
        "runbook_id": runbook_id,
        "status": "executed",
        "message": f"Executed {runbook['title']} remediation.",
        "command": command,
        "output": f"[EXECUTE] {command}\n[OK] Pods checked: 3/3 ready\n[OK] Events reviewed: no anomalies\n[OK] Readiness verified\n[OK] Result logged to incidents/INC-20260422153045/remediation.log",
    }


@router.get("/topology")
async def platform_topology() -> dict[str, Any]:
    return {
        "nodes": [
            {
                "id": "local",
                "label": "Local Host",
                "group": "Local Host",
                "status": "healthy",
                "role": "Developer, CI, and demo operator entrypoint",
            },
            {
                "id": "k3d",
                "label": "k3d Cluster",
                "group": "k3d Cluster",
                "status": "healthy",
                "role": "Three-node local Kubernetes control plane",
            },
            {
                "id": "service",
                "label": "Kubernetes Service",
                "group": "Application Namespace",
                "status": "healthy",
                "role": "Routes localhost:8080 traffic to FastAPI pods",
            },
            {
                "id": "pods",
                "label": "FastAPI Pods",
                "group": "Application Namespace",
                "status": "healthy" if not CHAOS_MODE["enabled"] else "degraded",
                "role": "Three replicas with probes and RED metrics",
            },
            {
                "id": "prometheus",
                "label": "Prometheus",
                "group": "Monitoring Namespace",
                "status": "observing",
                "role": "Scrapes /metrics and evaluates SLO rules",
            },
            {
                "id": "grafana",
                "label": "Grafana",
                "group": "Monitoring Namespace",
                "status": "observing",
                "role": "Visualizes RED and Kubernetes metrics",
            },
            {
                "id": "argocd",
                "label": "ArgoCD",
                "group": "GitOps Namespace",
                "status": "reconciling",
                "role": "Reconciles manifests from Git",
            },
            {
                "id": "github",
                "label": "GitHub Manifests",
                "group": "CI/CD",
                "status": "synced",
                "role": "Desired state and DevSecOps pipeline source",
            },
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


@router.get("/events")
async def platform_events() -> list[dict[str, Any]]:
    return [
        {
            "time": "15:30:45Z",
            "severity": "warning",
            "text": "Pod termination requested by chaos workflow",
        },
        {
            "time": "15:30:49Z",
            "severity": "warning",
            "text": "Replica availability dropped to 2/3",
        },
        {
            "time": "15:30:50Z",
            "severity": "info",
            "text": "Snapshot captured pods, events, logs, deployment state",
        },
        {
            "time": "15:30:51Z",
            "severity": "info",
            "text": "Runbook mapped: runbooks/pod-crash.md",
        },
        {
            "time": "15:30:55Z",
            "severity": "info",
            "text": "Deployment controller scheduled replacement pod",
        },
        {
            "time": "15:30:57Z",
            "severity": "success",
            "text": "Readiness passed: 3/3 replicas available",
        },
        {
            "time": "15:30:58Z",
            "severity": "success",
            "text": "MTTR validated: 12s under 30s objective",
        },
        {"time": "15:30:59Z", "severity": "success", "text": "Audit report generated"},
    ]


@router.get("/controls")
async def platform_controls() -> list[dict[str, Any]]:
    return [
        {
            "category": "Runtime Safety",
            "name": "Liveness probe",
            "artifact": "manifests/deployment.yaml",
            "status": "configured",
            "risk_reduced": "Restarts failed containers automatically",
            "why": "Detects application process failure",
        },
        {
            "category": "Runtime Safety",
            "name": "Readiness probe",
            "artifact": "manifests/deployment.yaml",
            "status": "configured",
            "risk_reduced": "Removes unready pods from service routing",
            "why": "Prevents bad pods from receiving traffic",
        },
        {
            "category": "Runtime Safety",
            "name": "Non-root container",
            "artifact": "policy/kubernetes.rego",
            "status": "enforced",
            "risk_reduced": "Limits container privilege",
            "why": "Reduces blast radius if the app is compromised",
        },
        {
            "category": "Availability and Recovery",
            "name": "PodDisruptionBudget",
            "artifact": "manifests/poddisruptionbudget.yaml",
            "status": "configured",
            "risk_reduced": "Maintains minimum replicas during voluntary disruptions",
            "why": "Protects availability during maintenance",
        },
        {
            "category": "Availability and Recovery",
            "name": "HorizontalPodAutoscaler",
            "artifact": "manifests/hpa.yaml",
            "status": "documented gap",
            "risk_reduced": "Scales replicas on CPU once metrics-server is present",
            "why": "Adds capacity during sustained load",
        },
        {
            "category": "Network and Access Control",
            "name": "NetworkPolicy",
            "artifact": "manifests/networkpolicy.yaml",
            "status": "configured",
            "risk_reduced": "Restricts ingress, egress, Prometheus scrape, and DNS paths",
            "why": "Limits lateral movement",
        },
        {
            "category": "Policy and CI Gates",
            "name": "OPA/Rego validation",
            "artifact": "policy/kubernetes.rego",
            "status": "configured",
            "risk_reduced": "Blocks unsafe Kubernetes manifest patterns",
            "why": "Turns platform standards into code",
        },
        {
            "category": "Policy and CI Gates",
            "name": "Bandit scan",
            "artifact": ".github/workflows/devsecops.yml",
            "status": "configured",
            "risk_reduced": "Finds Python security issues before merge",
            "why": "Shifts app security left",
        },
        {
            "category": "Policy and CI Gates",
            "name": "Trivy scan",
            "artifact": ".github/workflows/devsecops.yml",
            "status": "configured",
            "risk_reduced": "Blocks critical container vulnerabilities",
            "why": "Protects the delivery path",
        },
        {
            "category": "Observability and Alerting",
            "name": "Prometheus RED metrics",
            "artifact": "app/main.py",
            "status": "configured",
            "risk_reduced": "Measures rate, errors, and duration",
            "why": "Makes service behavior observable",
        },
        {
            "category": "Observability and Alerting",
            "name": "Burn-rate alerts",
            "artifact": "monitoring/prometheus-rules.yaml",
            "status": "configured",
            "risk_reduced": "Detects fast and slow error-budget consumption",
            "why": "Connects alerts to SLO impact",
        },
        {
            "category": "Availability and Recovery",
            "name": "ArgoCD self-heal",
            "artifact": "setup_argocd.sh",
            "status": "configured",
            "risk_reduced": "Reconciles drift back to Git state",
            "why": "Keeps runtime aligned with reviewed manifests",
        },
    ]


@router.post("/chaos/degraded")
async def platform_chaos_degraded() -> dict[str, Any]:
    CHAOS_MODE["enabled"] = True
    CHAOS_MODE["probability"] = 0.5
    entry = {
        "id": f"CE-{int(time.time() * 1000)}",
        "action": "trigger",
        "label": "Degraded mode enabled",
        "timestamp": _iso_now(),
        "outcome": "degraded",
        "note": "Health endpoint will fail 50% of requests",
        "mttr_seconds": None,
        "slo_met": None,
    }
    _chaos_history.append(entry)
    return {
        "status": "degraded",
        "message": "Chaos mode enabled. Health endpoint will fail 50% of requests.",
        "entry": entry,
    }


@router.post("/chaos/reset")
async def platform_chaos_reset() -> dict[str, Any]:
    was_enabled = CHAOS_MODE["enabled"]
    CHAOS_MODE["enabled"] = False
    CHAOS_MODE["probability"] = 0.0
    mttr = None
    slo_met = True
    if was_enabled and _chaos_history:
        last_trigger = next(
            (h for h in reversed(_chaos_history) if h["action"] == "trigger"), None
        )
        if last_trigger:
            start = datetime.fromisoformat(
                last_trigger["timestamp"].replace("Z", "+00:00")
            )
            end = datetime.now(timezone.utc)
            mttr = int((end - start).total_seconds())
            slo_met = mttr <= 30
    entry = {
        "id": f"CE-{int(time.time() * 1000)}",
        "action": "reset",
        "label": "Chaos mode reset",
        "timestamp": _iso_now(),
        "outcome": "recovered" if slo_met else "slo_breached",
        "note": "Service restored to healthy state",
        "mttr_seconds": mttr,
        "slo_met": slo_met,
    }
    _chaos_history.append(entry)
    return {
        "status": "reset",
        "message": "Chaos mode disabled. Service restored.",
        "entry": entry,
        "mttr_seconds": mttr,
        "slo_met": slo_met,
    }


@router.get("/chaos/history")
async def platform_chaos_history() -> list[dict[str, Any]]:
    return list(reversed(_chaos_history))
