# Governor UI

Governor UI is a local-first reliability control plane for demonstrating Kubernetes failure recovery, SLO validation, incident context capture, runbook mapping, and auditability. It converts the repo's scripts, manifests, metrics, and incident artifacts into a guided operational surface for Platform/SRE portfolio review.

## What it shows

- Command Center for platform health, latest incident, SLO state, GitOps sync, and policy gates
- Incident Replay for the pod-failure recovery lifecycle
- Incident detail pages with detection, snapshot, runbook, recovery, validation, and audit sections
- Runbook console mapped to alert names and remediation scripts
- SLO and error-budget view for availability, MTTR, error rate, and P95 latency
- Topology and GitOps flow with clickable node inspection
- Production controls mapped to repo artifacts and known boundaries

## Run the UI

```bash
cd ui
npm install
npm run dev
```

Open http://localhost:5173.

## Run backend plus UI

Terminal 1:

```bash
cd app
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
```

Terminal 2:

```bash
cd ui
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

The UI attempts live calls to `http://localhost:8080/platform/*`. If those calls fail, it automatically shows realistic demo data with a visible Demo Data state.

## Build and verify

```bash
cd ui
npm run build
```

From the repo root, the same build is available as:

```bash
make ui-build
```

For a live API smoke check, start the backend and run:

```bash
make api-dev
make api-smoke
```

## Demo mode

Demo mode works without a running Kubernetes cluster. It models:

- 3-node k3d cluster
- 3 FastAPI replicas
- Prometheus scraping `/metrics`
- Grafana available by port-forward
- ArgoCD reconciling manifests
- Pod failure recovery in 8 to 12 seconds
- MTTR objective under 30 seconds
- Incident lifecycle: Detect, Snapshot, Runbook, Recover, Validate, Audit

## Chaos and observability commands

```bash
./setup.sh
./chaos_monkey.sh
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring
kubectl port-forward svc/argocd-server 8443:443 -n argocd
make validate
make chaos
make summary
```

## Interpreting the command center

The first screen answers five reviewer questions: is the platform healthy, what failed, what evidence exists, what recovered it, and whether the SLO was met. It complements Grafana by showing operational workflow and audit narrative rather than rebuilding metric dashboards.

## Screenshot refresh

Screenshots referenced by the root README live in `ui/docs/ui-screenshots/`.

To refresh them, start the UI at http://localhost:5173 and run:

```bash
cd ui
node take-screenshots.mjs
```

Only refresh screenshots after visible UI changes. If Playwright or a browser runtime is unavailable, leave the existing screenshots in place and document the blocker.
