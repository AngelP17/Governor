.PHONY: validate validate-shell validate-python validate-yaml validate-json validate-summary validate-k8s validate-policy doctor chaos webhook-demo summary clean

validate: validate-shell validate-python validate-yaml validate-json
	@echo "All validations passed."

validate-shell:
	@echo "Validating shell scripts..."
	@bash -n chaos_monkey.sh
	@bash -n demo-chaos.sh
	@bash -n scripts/capture_incident_snapshot.sh
	@bash -n scripts/remediate_pod_crash.sh
	@bash -n scripts/remediate_high_latency.sh
	@bash -n scripts/remediate_deployment_rollback.sh
	@echo "Shell scripts OK."

validate-python:
	@echo "Validating Python scripts..."
	@python3 -m py_compile scripts/generate_incident_report.py
	@python3 -m py_compile scripts/alert_webhook_receiver.py
	@python3 -m py_compile scripts/summarize_experiments.py
	@echo "Python scripts OK."

validate-yaml:
	@echo "Validating YAML files..."
	@python3 -c "import glob, yaml; [yaml.safe_load(open(f)) for f in sorted(glob.glob('monitoring/*.yaml') + glob.glob('manifests/*.yaml'))]"
	@echo "YAML files OK."

validate-json:
	@echo "Validating JSON files..."
	@python3 -c "import json, glob; [json.load(open(f)) for f in glob.glob('docs/sample-artifacts/*.json')]"
	@python3 -c "import json; json.load(open('monitoring/grafana-dashboard.json'))"
	@echo "JSON files OK."

validate-k8s:
	@echo "Validating Kubernetes manifests..."
	@if command -v kubeconform >/dev/null 2>&1; then \
		kubeconform -strict -summary manifests/*.yaml; \
	else \
		echo "SKIP: kubeconform not installed. Install with: go install github.com/yannh/kubeconform/cmd/kubeconform@latest"; \
	fi

validate-policy:
	@echo "Validating policies..."
	@if command -v conftest >/dev/null 2>&1; then \
		conftest test manifests/*.yaml --policy policy/; \
	else \
		echo "SKIP: conftest not installed. Install with: brew install conftest"; \
	fi

validate-summary:
	@echo "Running summary on sample artifacts..."
	@mkdir -p incidents/INC-SAMPLE-001
	@cp docs/sample-artifacts/sample-result.json incidents/INC-SAMPLE-001/result.json
	@python3 scripts/summarize_experiments.py
	@rm -rf incidents/INC-SAMPLE-001 incidents/experiment-summary.md incidents/experiment-summary.json
	@echo "Summary validation OK."

chaos:
	@./chaos_monkey.sh

webhook-demo:
	@echo "Starting webhook receiver on :9095..."
	@python3 scripts/alert_webhook_receiver.py --port 9095

summary:
	@python3 scripts/summarize_experiments.py

clean:
	@rm -rf incidents/INC-*
	@rm -f incidents/experiment-summary.md incidents/experiment-summary.json
	@echo "Cleaned incident artifacts."

doctor:
	@echo "Checking prerequisites..."
	@printf "%-14s" "docker:" && (command -v docker >/dev/null 2>&1 && docker --version || echo "MISSING")
	@printf "%-14s" "terraform:" && (command -v terraform >/dev/null 2>&1 && terraform --version | head -1 || echo "MISSING")
	@printf "%-14s" "kubectl:" && (command -v kubectl >/dev/null 2>&1 && kubectl version --client --short 2>/dev/null || kubectl version --client 2>/dev/null | head -1 || echo "MISSING")
	@printf "%-14s" "helm:" && (command -v helm >/dev/null 2>&1 && helm version --short || echo "MISSING")
	@printf "%-14s" "k3d:" && (command -v k3d >/dev/null 2>&1 && k3d version | head -1 || echo "MISSING")
	@printf "%-14s" "kubeconform:" && (command -v kubeconform >/dev/null 2>&1 && kubeconform -version || echo "optional (go install)")
	@printf "%-14s" "conftest:" && (command -v conftest >/dev/null 2>&1 && conftest --version || echo "optional (brew install conftest)")
	@echo "Done."
