#!/usr/bin/env python3

import json
import os
import sys
import argparse
import statistics
from datetime import datetime, timezone
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Aggregate experiment results across incident directories"
    )
    parser.add_argument(
        "--incidents-dir",
        default=None,
        help="Path to incidents directory (default: incidents/ relative to script parent)",
    )
    return parser.parse_args()


def load_json_safe(filepath):
    try:
        with open(filepath) as f:
            return json.load(f)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    except PermissionError:
        print(f"  [warn] permission denied: {filepath}", file=sys.stderr)
        return None


def file_exists_safe(filepath):
    try:
        return filepath.exists()
    except PermissionError:
        print(f"  [warn] permission denied checking: {filepath}", file=sys.stderr)
        return False


def scan_incidents(incidents_dir):
    incidents = []
    skipped_count = 0

    try:
        entries = sorted(incidents_dir.iterdir())
    except PermissionError:
        print(f"[error] permission denied: {incidents_dir}", file=sys.stderr)
        return incidents, skipped_count

    for entry in entries:
        if not entry.is_dir():
            continue
        if not entry.name.startswith("INC-"):
            continue

        incident_id = entry.name
        result_path = entry / "result.json"
        alert_path = entry / "alert.json"
        remediation_log_path = entry / "remediation.log"
        remediation_decision_path = entry / "remediation-decision.json"

        source = "chaos"
        if file_exists_safe(alert_path):
            source = "alert"

        if not file_exists_safe(result_path):
            incidents.append(
                {
                    "incident_id": incident_id,
                    "source": source,
                    "slo_met": None,
                    "recovery_time_seconds": None,
                    "failure_type": None,
                    "_has_remediation_log": file_exists_safe(remediation_log_path),
                    "_has_remediation_decision": file_exists_safe(
                        remediation_decision_path
                    ),
                }
            )
            continue

        result = load_json_safe(result_path)
        if result is None:
            print(
                f"  [warn] malformed result.json in {incident_id}, skipping",
                file=sys.stderr,
            )
            skipped_count += 1
            continue

        recovery_time = result.get("recovery_time_seconds")
        slo_met = result.get("slo_met")
        failure_type = result.get("failure_type")

        incidents.append(
            {
                "incident_id": incident_id,
                "source": source,
                "slo_met": slo_met,
                "recovery_time_seconds": recovery_time,
                "failure_type": failure_type,
                "_has_remediation_log": file_exists_safe(remediation_log_path),
                "_has_remediation_decision": file_exists_safe(
                    remediation_decision_path
                ),
            }
        )

    return incidents, skipped_count


def compute_summary(incidents, skipped_count):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    chaos_incidents = [i for i in incidents if i["source"] == "chaos"]
    slo_evaluable = [i for i in chaos_incidents if i["slo_met"] is not None]
    slo_pass_count = sum(1 for i in slo_evaluable if i["slo_met"] is True)
    slo_pass_rate = (
        f"{(slo_pass_count / len(slo_evaluable)) * 100:.1f}%"
        if slo_evaluable
        else "N/A"
    )

    recovery_times = [
        i["recovery_time_seconds"]
        for i in incidents
        if i["recovery_time_seconds"] is not None
    ]

    mttr_stats = {
        "average_seconds": round(statistics.mean(recovery_times), 2)
        if recovery_times
        else None,
        "min_seconds": min(recovery_times) if recovery_times else None,
        "max_seconds": max(recovery_times) if recovery_times else None,
        "sample_count": len(recovery_times),
    }

    failure_breakdown = {}
    for i in incidents:
        ft = i["failure_type"]
        if ft is not None:
            failure_breakdown[ft] = failure_breakdown.get(ft, 0) + 1

    source_breakdown = {"chaos": 0, "alert": 0}
    for i in incidents:
        src = i["source"]
        source_breakdown[src] = source_breakdown.get(src, 0) + 1

    remediation_stats = {
        "with_remediation_log": sum(1 for i in incidents if i["_has_remediation_log"]),
        "with_remediation_decision": sum(
            1 for i in incidents if i["_has_remediation_decision"]
        ),
    }

    incident_list = []
    for i in incidents:
        incident_list.append(
            {
                "incident_id": i["incident_id"],
                "source": i["source"],
                "slo_met": i["slo_met"],
                "recovery_time_seconds": i["recovery_time_seconds"],
                "failure_type": i["failure_type"],
            }
        )

    summary = {
        "generated_at": now,
        "total_incidents": len(incidents),
        "skipped_incidents": skipped_count,
        "slo_pass_rate": slo_pass_rate,
        "mttr_stats": mttr_stats,
        "failure_type_breakdown": failure_breakdown,
        "source_breakdown": source_breakdown,
        "remediation_stats": remediation_stats,
        "incidents": incident_list,
    }

    return summary


def generate_markdown(summary):
    lines = []
    lines.append("# Experiment Summary")
    lines.append("")
    lines.append(f"Generated: {summary['generated_at']}")
    lines.append("")

    lines.append("## Overview")
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|--------|-------|")
    lines.append(f"| Total Incidents | {summary['total_incidents']} |")
    lines.append(f"| SLO Pass Rate | {summary['slo_pass_rate']} |")
    avg_mttr = summary["mttr_stats"]["average_seconds"]
    lines.append(
        f"| Avg MTTR | {f'{avg_mttr:.2f}s' if avg_mttr is not None else 'N/A'} |"
    )
    lines.append(f"| Chaos Incidents | {summary['source_breakdown'].get('chaos', 0)} |")
    lines.append(f"| Alert Incidents | {summary['source_breakdown'].get('alert', 0)} |")
    lines.append("")

    lines.append("## MTTR Statistics")
    lines.append("")
    mttr = summary["mttr_stats"]
    lines.append("| Metric | Value |")
    lines.append("|--------|-------|")
    lines.append(f"| Sample Count | {mttr['sample_count']} |")
    min_s = mttr["min_seconds"]
    max_s = mttr["max_seconds"]
    avg_s = mttr["average_seconds"]
    lines.append(f"| Min | {f'{min_s}s' if min_s is not None else 'N/A'} |")
    lines.append(f"| Max | {f'{max_s}s' if max_s is not None else 'N/A'} |")
    lines.append(f"| Average | {f'{avg_s:.2f}s' if avg_s is not None else 'N/A'} |")
    lines.append("")

    lines.append("## Failure Type Breakdown")
    lines.append("")
    if summary["failure_type_breakdown"]:
        lines.append("| Failure Type | Count |")
        lines.append("|--------------|-------|")
        for ft, count in sorted(summary["failure_type_breakdown"].items()):
            lines.append(f"| {ft} | {count} |")
    else:
        lines.append("No failure type data available.")
    lines.append("")

    lines.append("## Source Breakdown")
    lines.append("")
    lines.append("| Source | Count |")
    lines.append("|--------|-------|")
    for src, count in sorted(summary["source_breakdown"].items()):
        lines.append(f"| {src} | {count} |")
    lines.append("")

    lines.append("## Remediation Statistics")
    lines.append("")
    rem = summary["remediation_stats"]
    lines.append("| Metric | Count |")
    lines.append("|--------|-------|")
    lines.append(f"| With Remediation Log | {rem['with_remediation_log']} |")
    lines.append(f"| With Remediation Decision | {rem['with_remediation_decision']} |")
    lines.append("")

    lines.append("## Incident List")
    lines.append("")
    if summary["incidents"]:
        lines.append(
            "| Incident ID | Source | SLO Met | Recovery Time | Failure Type |"
        )
        lines.append(
            "|-------------|--------|---------|---------------|--------------|"
        )
        for inc in summary["incidents"]:
            slo_str = str(inc["slo_met"]) if inc["slo_met"] is not None else "N/A"
            rt = inc["recovery_time_seconds"]
            rt_str = f"{rt}s" if rt is not None else "N/A"
            ft_str = inc["failure_type"] if inc["failure_type"] is not None else "N/A"
            lines.append(
                f"| {inc['incident_id']} | {inc['source']} | {slo_str} | {rt_str} | {ft_str} |"
            )
    else:
        lines.append("No incidents found.")
    lines.append("")

    if summary["skipped_incidents"] > 0:
        lines.append(
            f"> Skipped {summary['skipped_incidents']} incident(s) due to malformed data."
        )
        lines.append("")

    return "\n".join(lines) + "\n"


def main():
    args = parse_args()

    if args.incidents_dir:
        incidents_dir = Path(args.incidents_dir)
    else:
        script_dir = Path(__file__).resolve().parent
        incidents_dir = script_dir.parent / "incidents"

    if not incidents_dir.is_dir():
        print(
            f"[error] incidents directory not found: {incidents_dir}", file=sys.stderr
        )
        sys.exit(1)

    incidents, skipped_count = scan_incidents(incidents_dir)

    if not incidents and skipped_count == 0:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        summary = {
            "generated_at": now,
            "total_incidents": 0,
            "skipped_incidents": 0,
            "slo_pass_rate": "N/A",
            "mttr_stats": {
                "average_seconds": None,
                "min_seconds": None,
                "max_seconds": None,
                "sample_count": 0,
            },
            "failure_type_breakdown": {},
            "source_breakdown": {"chaos": 0, "alert": 0},
            "remediation_stats": {
                "with_remediation_log": 0,
                "with_remediation_decision": 0,
            },
            "incidents": [],
        }
        md_content = "# Experiment Summary\n\n"
        md_content += f"Generated: {now}\n\n"
        md_content += "No incidents found.\n"
    else:
        summary = compute_summary(incidents, skipped_count)
        md_content = generate_markdown(summary)

    json_path = incidents_dir / "experiment-summary.json"
    md_path = incidents_dir / "experiment-summary.md"

    try:
        with open(json_path, "w") as f:
            json.dump(summary, f, indent=2)
        print(f"[summary] {json_path}")
    except PermissionError:
        print(f"[error] cannot write {json_path}", file=sys.stderr)

    try:
        with open(md_path, "w") as f:
            f.write(md_content)
        print(f"[summary] {md_path}")
    except PermissionError:
        print(f"[error] cannot write {md_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
