#!/usr/bin/env python3

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def read_lines(filepath, max_lines=None):
    if not filepath.exists():
        return None
    lines = filepath.read_text(errors="replace").splitlines()
    if max_lines:
        lines = lines[:max_lines]
    return lines


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <incident-directory>", file=sys.stderr)
        sys.exit(1)

    incident_dir = Path(sys.argv[1])
    result_path = incident_dir / "result.json"

    if not result_path.exists():
        print(f"Error: {result_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(result_path) as f:
        result = json.load(f)

    incident_id = result.get("incident_id", "UNKNOWN")
    failure_type = result.get("failure_type", "UNKNOWN")
    victim_pod = result.get("victim_pod", "UNKNOWN")
    timestamp_utc = result.get("timestamp_utc", "UNKNOWN")
    recovery_time_seconds = result.get("recovery_time_seconds")
    slo_target_seconds = result.get("slo_target_seconds")
    slo_met = result.get("slo_met")

    snapshot_pre = incident_dir / "snapshot-pre"
    snapshot_post = incident_dir / "snapshot-post"

    pre_pods = read_lines(snapshot_pre / "pods.txt", max_lines=20)
    post_pods = read_lines(snapshot_post / "pods.txt", max_lines=20)

    lines = []
    lines.append(f"# Incident Report: {incident_id}")
    lines.append("")
    lines.append("## Metadata")
    lines.append("")
    lines.append(f"| Field | Value |")
    lines.append(f"|-------|-------|")
    lines.append(f"| Incident ID | `{incident_id}` |")
    lines.append(f"| Failure Type | `{failure_type}` |")
    lines.append(f"| Victim Pod | `{victim_pod}` |")
    lines.append(f"| Timestamp (UTC) | `{timestamp_utc}` |")
    lines.append("")

    lines.append("## SLO Evaluation")
    lines.append("")
    if (
        recovery_time_seconds is not None
        and slo_target_seconds is not None
        and slo_met is not None
    ):
        slo_status = "PASS" if slo_met else "FAIL"
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Recovery Time | {recovery_time_seconds}s |")
        lines.append(f"| SLO Target | {slo_target_seconds}s |")
        lines.append(f"| SLO Met | **{slo_status}** |")
    else:
        lines.append("SLO data not available in result.json.")
    lines.append("")

    lines.append("## Pre-Recovery State")
    lines.append("")
    if pre_pods:
        lines.append("```")
        lines.extend(pre_pods)
        lines.append("```")
    else:
        lines.append("_No pre-recovery snapshot available._")
    lines.append("")

    lines.append("## Post-Recovery State")
    lines.append("")
    if post_pods:
        lines.append("```")
        lines.extend(post_pods)
        lines.append("```")
    else:
        lines.append("_No post-recovery snapshot available._")
    lines.append("")

    remediation_log = incident_dir / "remediation.log"
    remediation_decision = incident_dir / "remediation-decision.json"
    has_remediation_log = remediation_log.exists()
    has_remediation_decision = remediation_decision.exists()

    if has_remediation_log or has_remediation_decision:
        lines.append("## Remediation Summary")
        lines.append("")

        if has_remediation_log:
            log_lines = read_lines(remediation_log, max_lines=15)
            if log_lines:
                lines.append("### Remediation Log (first 15 lines)")
                lines.append("")
                lines.append("```")
                lines.extend(log_lines)
                lines.append("```")
                lines.append("")

        if has_remediation_decision:
            try:
                with open(remediation_decision) as df:
                    decision_data = json.load(df)
                lines.append("### Remediation Decision")
                lines.append("")
                lines.append("| Field | Value |")
                lines.append("|-------|-------|")
                lines.append(f"| Script | `{decision_data.get('script', 'N/A')}` |")
                lines.append(f"| Decision | `{decision_data.get('decision', 'N/A')}` |")
                lines.append(f"| Reason | `{decision_data.get('reason', 'N/A')}` |")
                lines.append(f"| Mode | `{decision_data.get('mode', 'N/A')}` |")
                lines.append("")
            except (json.JSONDecodeError, OSError):
                pass

    lines.append("## Runbook Reference")
    lines.append("")
    lines.append(
        "See [runbooks/pod-crash.md](../runbooks/pod-crash.md) for remediation steps."
    )
    lines.append("")

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines.append("---")
    lines.append(f"_Report generated at {generated_at}_")
    lines.append("")

    report_path = incident_dir / "report.md"
    report_path.write_text("\n".join(lines))
    print(f"[report] Generated {report_path}")


if __name__ == "__main__":
    main()
