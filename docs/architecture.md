# Architecture

Full system architecture for the Kubernetes Reliability Platform. All diagrams use Mermaid.js.

---

## Table of Contents

1. [Cluster Topology](#cluster-topology)
2. [Application Stack](#application-stack)
3. [Observability Pipeline](#observability-pipeline)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Closed-Loop Incident Workflow](#closed-loop-incident-workflow)
6. [Incident Artifact Flow](#incident-artifact-flow)
7. [Alert-to-Runbook Mapping](#alert-to-runbook-mapping)
8. [GitOps Reconciliation](#gitops-reconciliation)
9. [Networking](#networking)
10. [AWS Migration Path](#aws-migration-path)

---

## Cluster Topology

Three-node k3d cluster with anti-affinity pod scheduling across worker nodes.

```mermaid
graph TB
    subgraph LocalHost["Local Machine (Docker Desktop)"]
        subgraph k3d["k3d Cluster: resilience-pilot"]
            LB["k3d LoadBalancer<br/>host :8080 → cluster :80"]

            subgraph CP["Control Plane Node"]
                API["kube-apiserver"]
                ETCD["etcd"]
                SCHED["scheduler"]
                CTRL["controller-manager"]
            end

            subgraph WN0["Worker Node 0<br/>k3d-resilience-pilot-agent-0"]
                KUBELET0["kubelet"]
                PROXY0["kube-proxy"]
                RUNTIME0["containerd"]
            end

            subgraph WN1["Worker Node 1<br/>k3d-resilience-pilot-agent-1"]
                KUBELET1["kubelet"]
                PROXY1["kube-proxy"]
                RUNTIME1["containerd"]
            end
        end
    end

    User["User / curl"] -->|"HTTP :8080"| LB
    LB --> API
    API --> SCHED
    API --> CTRL
    CTRL --> KUBELET0
    CTRL --> KUBELET1
    KUBELET0 --> RUNTIME0
    KUBELET1 --> RUNTIME1

    style LB fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style API fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style WN0 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style WN1 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

---

## Application Stack

FastAPI application deployed as 3 replicas with probes, anti-affinity, and Prometheus instrumentation.

```mermaid
flowchart TB
    subgraph Deploy["Deployment: resilience-pilot"]
        direction TB
        RS["ReplicaSet<br/>replicas: 3"]

        subgraph Pods["Pods (anti-affinity spread)"]
            P1["Pod 1<br/>Node 0"]
            P2["Pod 2<br/>Node 0"]
            P3["Pod 3<br/>Node 1"]
        end

        RS --> Pods
    end

    subgraph Container["Container: resilience-pilot"]
        APP["FastAPI<br/>:8080"]
        METRICS["/metrics<br/>prometheus_client"]
        HEALTH["/health<br/>liveness + readiness"]
        APP --> METRICS
        APP --> HEALTH
    end

    subgraph Probes["Kubernetes Probes"]
        LP["Liveness Probe<br/>GET /health :8080<br/>period: 5s, threshold: 3"]
        RP["Readiness Probe<br/>GET /health :8080<br/>period: 3s, threshold: 3"]
    end

    subgraph Security["Security Context"]
        NONROOT["runAsNonRoot: true<br/>UID: 1000"]
        ROFS["readOnlyRootFilesystem: true"]
        NODROP["capabilities: drop ALL"]
    end

    P1 --> Container
    P2 --> Container
    P3 --> Container
    LP -.->|"restart if dead"| Container
    RP -.->|"remove from endpoints"| Container

    style RS fill:#e3f2fd,stroke:#1565c0
    style APP fill:#fce4ec,stroke:#c62828
    style LP fill:#fff3e0,stroke:#f57c00
    style RP fill:#fff3e0,stroke:#f57c00
```

---

## Observability Pipeline

Prometheus scrapes application metrics, evaluates alert rules, and feeds Grafana dashboards.

```mermaid
flowchart LR
    subgraph App["Application"]
        EP["/metrics<br/>:8080"]
    end

    subgraph MonStack["Monitoring Stack (Helm: kube-prometheus-stack)"]
        PROM["Prometheus<br/>scrape: 15s"]
        GRAF["Grafana<br/>:3000"]
        AM["AlertManager"]
    end

    subgraph Rules["PrometheusRule CRD<br/>6 alert rules"]
        R1["HighPodRestartRate"]
        R2["PodCrashLoopBackOff"]
        R3["HighErrorRate"]
        R4["HighLatencyP95"]
        R5["InsufficientReplicas"]
        R6["ServiceDown"]
    end

    subgraph Dash["Grafana Dashboard"]
        D1["Request Rate (RED)"]
        D2["Error Rate"]
        D3["Latency P50/P95/P99"]
        D4["Pod Status"]
        D5["Chaos Events"]
    end

    EP -->|"scrape /metrics"| PROM
    PROM --> Rules
    Rules --> AM
    PROM -->|"data source"| GRAF
    GRAF --> Dash

    style PROM fill:#ede7f6,stroke:#5e35b1,stroke-width:2px
    style GRAF fill:#ede7f6,stroke:#5e35b1,stroke-width:2px
    style AM fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

---

## CI/CD Pipeline

GitHub Actions multi-stage pipeline with shift-left security gates, feeding ArgoCD for GitOps delivery.

```mermaid
flowchart TB
    PUSH["Code Push to main"] --> LINT["Lint & Scan<br/>Bandit (Python SAST)"]
    LINT --> BUILD["Build Docker Image<br/>multi-stage, commit SHA tag"]
    BUILD --> SCAN{"Trivy Vulnerability<br/>Scan"}
    SCAN -->|"CRITICAL found"| BLOCK["Block Release<br/>pipeline fails"]
    SCAN -->|"Pass"| PUSH_DH["Push to Docker Hub<br/>angellpt/resilience-pilot:SHA"]
    PUSH_DH --> UPDATE["Update manifests/<br/>deployment.yaml image tag"]
    UPDATE --> COMMIT["Auto-commit to Git<br/>new image SHA"]
    COMMIT --> ARGO["ArgoCD detects change<br/>polls every 3 min"]
    ARGO --> ROLLING["Rolling Update<br/>maxSurge: 1, maxUnavailable: 0"]
    ROLLING --> READY["All 3 replicas Ready<br/>zero downtime"]

    style SCAN fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style BLOCK fill:#ffebee,stroke:#c62828,stroke-width:2px
    style READY fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style ARGO fill:#e0f2f1,stroke:#00796b,stroke-width:2px
```

---

## Closed-Loop Incident Workflow

Six-phase auditable lifecycle for every chaos experiment. Each phase produces traceable artifacts.

```mermaid
sequenceDiagram
    participant PROM as Prometheus
    participant CM as chaos_monkey.sh
    participant SNAP as capture_incident_snapshot.sh
    participant RB as Runbook
    participant K8S as Kubernetes
    participant REPORT as generate_incident_report.py

    PROM->>CM: 1. Detect anomaly (alert fires)
    CM->>CM: Create incident ID: INC-20260422...
    CM->>K8S: Terminate victim pod
    CM->>SNAP: 2. Capture pre-recovery snapshot
    SNAP-->>CM: snapshot-pre/ (pods, events, logs, resources)
    CM->>RB: 3. Look up runbook via alert-runbook-map.yaml
    K8S->>K8S: 4. Recover: Deployment controller creates replacement pod
    K8S-->>CM: Pod Ready, recovery_time measured
    CM->>SNAP: 5. Capture post-recovery snapshot
    SNAP-->>CM: snapshot-post/ (pods, events, logs, resources)
    CM->>CM: Validate: recovery_time vs SLO (30s)
    CM->>CM: Write result.json
    CM->>REPORT: 6. Generate report.md
    REPORT-->>CM: report.md with SLO verdict + runbook link

    Note over PROM,REPORT: Artifacts archived in incidents/INC-20260422.../
```

---

## Incident Artifact Flow

Detailed view of what each phase captures and produces.

```mermaid
flowchart TB
    subgraph Incident["incidents/INC-20260422153045/"]
        direction TB
        subgraph PRE["snapshot-pre/"]
            P1["pods.txt"]
            P2["workloads.txt"]
            P3["events.txt"]
            P4["pod-describe.txt"]
            P5["app-logs.txt"]
            P6["pod-resources.txt"]
            P7["node-resources.txt"]
            P8["metadata.json"]
        end

        subgraph POST["snapshot-post/"]
            Q1["pods.txt"]
            Q2["workloads.txt"]
            Q3["events.txt"]
            Q4["pod-describe.txt"]
            Q5["app-logs.txt"]
            Q6["pod-resources.txt"]
            Q7["node-resources.txt"]
            Q8["metadata.json"]
        end

        RESULT["result.json<br/>incident_id, failure_type,<br/>victim_pod, recovery_time_seconds,<br/>slo_target_seconds, slo_met, timestamp_utc"]
        REPORT["report.md<br/>human-readable incident report<br/>with SLO verdict + runbook link"]
    end

    PRE --> RESULT
    RESULT --> REPORT
    POST --> REPORT

    style PRE fill:#fff9c4,stroke:#f9a825
    style POST fill:#e8f5e9,stroke:#388e3c
    style RESULT fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style REPORT fill:#ede7f6,stroke:#5e35b1,stroke-width:2px
```

---

## Alert-to-Runbook Mapping

Six Prometheus alerts mapped to four runbooks via `monitoring/alert-runbook-map.yaml`.

```mermaid
flowchart LR
    subgraph Alerts["Prometheus Alerts"]
        A1["HighPodRestartRate<br/>severity: warning"]
        A2["PodCrashLoopBackOff<br/>severity: critical"]
        A3["HighErrorRate<br/>severity: warning"]
        A4["HighLatencyP95<br/>severity: warning"]
        A5["InsufficientReplicas<br/>severity: warning"]
        A6["ServiceDown<br/>severity: critical"]
    end

    subgraph Runbooks["Runbooks"]
        RB1["runbooks/pod-crash.md"]
        RB2["runbooks/high-latency.md"]
        RB3["runbooks/dns-failure.md"]
        RB4["runbooks/deployment-rollback.md"]
    end

    subgraph Scripts["Snapshot Script"]
        SNAP["scripts/capture_incident_snapshot.sh"]
    end

    A1 --> RB1
    A2 --> RB1
    A3 --> RB4
    A4 --> RB2
    A5 --> RB4
    A6 --> RB1

    RB1 --> SNAP
    RB2 --> SNAP
    RB3 --> SNAP
    RB4 --> SNAP

    style A2 fill:#ffcdd2,stroke:#c62828
    style A6 fill:#ffcdd2,stroke:#c62828
    style A1 fill:#fff9c4,stroke:#f9a825
    style A3 fill:#fff9c4,stroke:#f9a825
    style A4 fill:#fff9c4,stroke:#f9a825
    style A5 fill:#fff9c4,stroke:#f9a825
```

---

## GitOps Reconciliation

ArgoCD watches the Git repository and reconciles cluster state with declared manifests.

```mermaid
sequenceDiagram
    participant DEV as Developer
    participant GH as GitHub
    participant GHA as GitHub Actions
    participant DH as Docker Hub
    participant ARGO as ArgoCD
    participant K8S as Kubernetes Cluster

    DEV->>GH: git push (code change)
    GH->>GHA: trigger devsecops.yml
    GHA->>GHA: lint (Bandit) → build → scan (Trivy)
    GHA->>DH: push image with commit SHA tag
    GHA->>GH: auto-commit new image tag to manifests/deployment.yaml
    GH-->>ARGO: detect manifest change (poll every 3m)
    ARGO->>ARGO: diff desired vs live state
    ARGO->>K8S: apply rolling update
    K8S->>K8S: maxSurge=1, maxUnavailable=0
    K8S-->>ARGO: all replicas healthy
    ARGO-->>GH: sync status: Healthy + Synced

    Note over DEV,K8S: Zero-downtime delivery via GitOps
```

---

## Networking

Traffic flow from host through k3d LoadBalancer to application pods.

```mermaid
flowchart LR
    subgraph Host["macOS Host"]
        CURL["curl / browser<br/>localhost:8080"]
    end

    subgraph k3dLB["k3d LoadBalancer"]
        PROXY["nginx proxy<br/>host:8080 → cluster:80"]
    end

    subgraph K8S["Kubernetes Networking"]
        INGRESS["Ingress<br/>path: /"]
        SVC["Service: resilience-pilot<br/>ClusterIP :8000"]
        EP["Endpoints<br/>pod IPs (3)"]
    end

    subgraph Pods["Application Pods"]
        P1["Pod 1<br/>:8080"]
        P2["Pod 2<br/>:8080"]
        P3["Pod 3<br/>:8080"]
    end

    CURL -->|":8080"| k3dLB
    k3dLB -->|":80"| INGRESS
    INGRESS --> SVC
    SVC --> EP
    EP --> P1
    EP --> P2
    EP --> P3

    style CURL fill:#e1f5fe,stroke:#0288d1
    style SVC fill:#e3f2fd,stroke:#1565c0
    style P1 fill:#fce4ec,stroke:#c62828
    style P2 fill:#fce4ec,stroke:#c62828
    style P3 fill:#fce4ec,stroke:#c62828
```

---

## AWS Migration Path

Component mapping from local k3d to production EKS. See [aws-deployment-plan.md](aws-deployment-plan.md) for details.

```mermaid
flowchart LR
    subgraph Local["Local (k3d)"]
        K3D["k3d cluster<br/>Terraform"]
        K3DLB["k3d LoadBalancer<br/>:8080"]
        DASH["Grafana<br/>port-forward :3000"]
        LOCALREG["Docker Hub"]
        LOCALSEC["K8s Secrets"]
    end

    subgraph AWS["AWS (EKS)"]
        EKS["EKS Cluster<br/>terraform-aws-modules/eks"]
        ALB["ALB / NLB<br/>AWS LB Controller"]
        AMP["Amazon Managed<br/>Prometheus + Grafana"]
        ECR["Amazon ECR"]
        SM["AWS Secrets Manager<br/>External Secrets Operator"]
        S3["S3<br/>incident artifacts"]
        SNS["SNS / EventBridge<br/>alerting"]
    end

    K3D -.->|"Terraform module swap"| EKS
    K3DLB -.->|"Ingress + ACM TLS"| ALB
    DASH -.->|"Managed observability"| AMP
    LOCALREG -.->|"ECR + IAM"| ECR
    LOCALSEC -.->|"External Secrets"| SM

    EKS --> S3
    EKS --> SNS

    style Local fill:#e8f5e9,stroke:#388e3c
    style AWS fill:#e1f5fe,stroke:#0288d1
```

---

## Related

- [Operational Feedback Loop](operational-feedback-loop.md) - Full incident lifecycle documentation
- [AWS Deployment Plan](aws-deployment-plan.md) - k3d to EKS migration guide
- [Pod Crash Runbook](../runbooks/pod-crash.md)
- [High Latency Runbook](../runbooks/high-latency.md)
- [DNS Failure Runbook](../runbooks/dns-failure.md)
- [Deployment Rollback Runbook](../runbooks/deployment-rollback.md)
