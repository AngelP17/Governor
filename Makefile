.PHONY: validate validate-shell validate-python validate-yaml validate-json validate-summary chaos webhook-demo summary clean

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
	@python3 -c "import yaml; [yaml.safe_load(open(f)) for f in ['monitoring/alert-runbook-map.yaml', 'monitoring/alertmanager-sample.yaml', 'monitoring/prometheus-rules.yaml']]"
	@echo "YAML files OK."

validate-json:
	@echo "Validating JSON files..."
	@python3 -c "import json, glob; [json.load(open(f)) for f in glob.glob('docs/sample-artifacts/*.json')]"
	@python3 -c "import json; json.load(open('monitoring/grafana-dashboard.json'))"
	@echo "JSON files OK."

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
