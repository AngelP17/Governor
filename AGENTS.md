# AGENTS.md

## Project Mission

This repo is a local-first Kubernetes reliability platform for portfolio demos. It shows failure injection, SLO validation, incident context capture, runbook mapping, remediation audit trails, monitoring, policy checks, and GitOps using k3d, FastAPI, React/Vite, Prometheus/Grafana, ArgoCD, Terraform, and shell automation.

Optimize future changes for reviewer clarity and repeatable local verification. Do not turn this into a production-hosted platform unless the user explicitly asks.

## Repo Map

- `app/` - FastAPI service, Prometheus metrics, platform API, Dockerfile, Python requirements.
- `ui/` - React 18 + Vite + TypeScript control-plane UI. Styling uses Tailwind 3 and the existing dark operational token system.
- `manifests/` - Kubernetes Deployment, Service, Ingress, NetworkPolicy, PDB, and HPA.
- `terraform/` - k3d cluster provisioning and local Terraform state.
- `monitoring/` - Prometheus rules, Alertmanager sample config, Grafana dashboard, alert-to-runbook map.
- `policy/` - OPA/Rego policy checks for Kubernetes manifests.
- `runbooks/` - Operator-facing remediation guides.
- `scripts/` - Incident capture, remediation, webhook receiver, and summary automation.
- `docs/` - Architecture, demo, SRE alignment, remediation contract, postmortem template, and sample artifacts.
- `incidents/` - Generated incident artifacts. Keep `.gitkeep`, but do not edit generated incident directories unless the task is explicitly about sample output.

## Setup And Run Commands

Prerequisite check:

```bash
make doctor
```

Full local platform setup:

```bash
chmod +x *.sh scripts/*.sh
./setup.sh
```

Backend only:

```bash
cd app
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
```

UI only:

```bash
cd ui
npm install
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

The UI intentionally falls back to visible Demo Data mode when the backend or Kubernetes cluster is not running.

## Validation Commands

Run the strongest relevant subset for the files you changed:

```bash
make validate
make validate-summary
make validate-k8s
make validate-policy
make api-smoke
cd ui && npm run build
cd app && python3 -m py_compile main.py platform_api.py
```

Notes:

- `make validate-k8s` skips if `kubeconform` is not installed.
- `make validate-policy` skips if `conftest` is not installed.
- `make api-smoke` requires the FastAPI server to be running on `http://localhost:8080`.
- `test_deployment.sh` requires a live Kubernetes deployment and `localhost:8080` access to the service.

## Frontend Conventions

- Keep the UI as a dense product/control-plane interface, not a marketing landing page.
- Use the existing dark theme, Tailwind 3 tokens, React Router, Recharts, and Phosphor icon family.
- Do not introduce a second icon family or a new design system unless the task explicitly requires it.
- Preserve route paths under `/command-center`, `/replay`, `/incidents`, `/runbooks`, `/slos`, `/topology`, `/controls`, and `/demo`.
- Preserve demo-data fallback behavior and make offline/live state visible.
- Respect reduced motion for animated UI. Prefer restrained motion that communicates hierarchy, feedback, or state.
- Avoid fake screenshots, generic stock-image placeholders, decorative status dots, and unrelated landing-page tropes.

## Backend And Platform Conventions

- Keep public API paths stable: `/health`, `/metrics`, `/simulate-crash`, and `/platform/*`.
- Keep Kubernetes, Terraform, remediation, chaos, and GitOps behavior unchanged unless fixing a documented bug.
- Platform API data is a portfolio/demo contract. If a value is simulated or sample-backed, keep that clear in docs or UI labels.
- Remediation execution paths must remain local-demo oriented and auditable. Do not add auto-remediation against shared or production environments.
- Shell scripts should stay `set -euo pipefail` where already present, with dry-run support preserved for remediation scripts.

## Generated Files And Files To Avoid

Do not edit these unless explicitly asked:

- `.venv/`
- `.ruff_cache/`
- `scripts/__pycache__/`
- `ui/tsconfig.tsbuildinfo`
- `terraform/terraform.tfstate`
- generated `incidents/INC-*`
- local screenshots unless the task is specifically a screenshot refresh

Be careful with `.github/workflows/devsecops.yml`: it updates `manifests/deployment.yaml` on main after Docker Hub push. Do not change CI release behavior without calling it out.

## Documentation Expectations

When changing commands, setup flow, tests, screenshots, or boundaries, update the relevant README or docs in the same change. Do not invent commands. Derive commands from `Makefile`, package scripts, shell scripts, or checked-in docs.

## Done When

A future Codex session should be able to:

- Understand the repo purpose, architecture, and safe edit boundaries within a few minutes.
- Run the backend and UI locally.
- Know which checks apply to docs, UI, backend, manifests, policy, and generated artifacts.
- See skipped checks and blockers explicitly called out.
- Trust that public routes, API paths, Kubernetes behavior, and demo fallback semantics were not changed accidentally.
