#!/usr/bin/env python3

"""Lightweight Alertmanager webhook receiver — CAPTURE ONLY.

SAFETY BOUNDARY: This receiver does NOT execute remediation scripts.
It captures alert payloads as incident artifacts for later operator review.
All remediation requires explicit operator invocation outside this process.
"""

import json
import sys
import os
import subprocess
import argparse
import datetime
import pathlib
from http.server import HTTPServer, BaseHTTPRequestHandler

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
INCIDENTS_DIR = PROJECT_DIR / "incidents"
DEFAULT_MAP_FILE = PROJECT_DIR / "monitoring" / "alert-runbook-map.yaml"


def load_runbook_map(map_file):
    try:
        import yaml

        with open(map_file, "r") as f:
            data = yaml.safe_load(f)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def lookup_runbook_info(map_data, alert_name):
    alerts = map_data.get("alerts", {})
    entry = alerts.get(alert_name, {})
    if not isinstance(entry, dict):
        entry = {}
    return {
        "runbook": entry.get("runbook"),
        "snapshot_script": entry.get("snapshot_script"),
        "description": entry.get("description"),
    }


def create_incident(payload):
    now = datetime.datetime.now(datetime.timezone.utc)
    timestamp = now.strftime("%Y%m%dT%H%M%SZ")

    alerts = payload.get("alerts", [])
    if not alerts:
        return None

    first_alert = alerts[0]
    labels = first_alert.get("labels", {})
    alert_name = labels.get("alertname", "unknown")
    incident_id = f"INC-{timestamp}-{alert_name}"
    incident_dir = INCIDENTS_DIR / incident_id
    incident_dir.mkdir(parents=True, exist_ok=True)

    with open(incident_dir / "alert.json", "w") as f:
        json.dump(payload, f, indent=2, default=str)

    status = first_alert.get("status", "firing")
    severity = labels.get("severity", "unknown")
    namespace = labels.get("namespace", "unknown")

    map_file = DEFAULT_MAP_FILE
    runbook_map = load_runbook_map(map_file)
    runbook_info = lookup_runbook_info(runbook_map, alert_name)

    context = {
        "incident_id": incident_id,
        "source": "alert",
        "alert_name": alert_name,
        "severity": severity,
        "status": status,
        "namespace": namespace,
        "timestamp_utc": now.isoformat(),
        "runbook": runbook_info.get("runbook"),
        "snapshot_script": runbook_info.get("snapshot_script"),
        "description": runbook_info.get("description"),
    }

    with open(incident_dir / "alert-context.json", "w") as f:
        json.dump(context, f, indent=2)

    snapshot_script = SCRIPT_DIR / "capture_incident_snapshot.sh"
    if snapshot_script.exists():
        try:
            subprocess.run(
                [str(snapshot_script), str(incident_dir)],
                capture_output=True,
                timeout=30,
            )
        except Exception:
            pass

    print(f"[{now.isoformat()}] Incident captured: {incident_id}", flush=True)
    return incident_id


class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        sys.stderr.write(f"[{ts}] {self.address_string()} - {format % args}\n")
        sys.stderr.flush()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/alert":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps({"status": "error", "message": "invalid JSON"}).encode()
                )
                return

            incident_id = create_incident(payload)
            if incident_id is None:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps(
                        {"status": "error", "message": "no alerts in payload"}
                    ).encode()
                )
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(
                json.dumps({"status": "captured", "incident_id": incident_id}).encode()
            )
        else:
            self.send_response(404)
            self.end_headers()


def main():
    global DEFAULT_MAP_FILE

    parser = argparse.ArgumentParser(
        description="Alertmanager webhook receiver (capture only)"
    )
    parser.add_argument("--port", type=int, default=9095)
    parser.add_argument("--map-file", type=str, default=str(DEFAULT_MAP_FILE))
    args = parser.parse_args()

    DEFAULT_MAP_FILE = pathlib.Path(args.map_file)

    INCIDENTS_DIR.mkdir(parents=True, exist_ok=True)

    server = HTTPServer(("0.0.0.0", args.port), WebhookHandler)
    print(
        f"Alert webhook receiver started on 0.0.0.0:{args.port} (capture only, no remediation)"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    server.server_close()


if __name__ == "__main__":
    main()
