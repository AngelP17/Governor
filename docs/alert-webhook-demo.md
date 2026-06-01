# Alert Webhook Demo

## Overview

The webhook receiver captures Alertmanager alerts as incident artifacts. It does NOT auto-remediate. This is a deliberate safety boundary.

When an alert fires, the receiver writes the raw payload and normalized context to an incident directory under `incidents/`. Operators can then review the captured data and decide on remediation manually.

## Safety Model

Capture-only. No remediation is triggered from the webhook flow. All remediation requires explicit operator invocation. The receiver:

- Accepts alert payloads via HTTP POST
- Persists raw and normalized alert data to disk
- Optionally runs a snapshot capture script (read-only diagnostics)
- Never executes remediation or destructive actions

## Start the Receiver

```bash
python3 scripts/alert_webhook_receiver.py --port 9095
```

Optional flags:

- `--port` — listen port (default 9095)
- `--map-file` — path to alert-runbook-map.yaml for enrichment

## Send a Test Alert

```bash
curl -X POST http://localhost:9095/alert \
  -H "Content-Type: application/json" \
  -d '{
    "receiver": "webhook-local",
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "PodCrashLoopBackOff",
          "namespace": "default",
          "severity": "critical",
          "pod": "governor-7d9f8b6c4-x2kjl"
        },
        "annotations": {
          "summary": "Pod is in CrashLoopBackOff state",
          "description": "Pod governor-7d9f8b6c4-x2kjl in namespace default has restarted 5 times in the last 10 minutes."
        },
        "startsAt": "2026-04-22T10:00:00Z",
        "endsAt": "0001-01-01T00:00:00Z",
        "generatorURL": "http://prometheus:9090/graph"
      }
    ],
    "groupLabels": {
      "alertname": "PodCrashLoopBackOff",
      "namespace": "default"
    },
    "commonLabels": {
      "alertname": "PodCrashLoopBackOff",
      "namespace": "default",
      "severity": "critical"
    },
    "commonAnnotations": {
      "summary": "Pod is in CrashLoopBackOff state"
    },
    "externalURL": "http://alertmanager:9093",
    "version": "4",
    "groupKey": "{}/{}/{}:{alertname=\"PodCrashLoopBackOff\", namespace=\"default\"}"
  }'
```

Expected response:

```json
{"status": "captured", "incident_id": "INC-20260422T100000Z-PodCrashLoopBackOff"}
```

## Verify Capture

Check the created incident directory:

```bash
ls incidents/INC-*PodCrashLoopBackOff/
```

Expected files:

- `alert.json` — raw Alertmanager payload
- `alert-context.json` — normalized metadata (incident ID, severity, namespace, runbook link, etc.)
- Snapshot artifacts (if `scripts/capture_incident_snapshot.sh` exists)

## Sample Payload

A minimal Alertmanager webhook payload for testing:

```json
{
  "receiver": "webhook-local",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "PodCrashLoopBackOff",
        "namespace": "default",
        "severity": "critical",
        "pod": "governor-7d9f8b6c4-x2kjl"
      },
      "annotations": {
        "summary": "Pod is in CrashLoopBackOff state",
        "description": "Pod has restarted 5 times in the last 10 minutes."
      },
      "startsAt": "2026-04-22T10:00:00Z",
      "endsAt": "0001-01-01T00:00:00Z"
    }
  ],
  "groupLabels": {
    "alertname": "PodCrashLoopBackOff"
  },
  "commonLabels": {
    "alertname": "PodCrashLoopBackOff",
    "severity": "critical"
  },
  "commonAnnotations": {
    "summary": "Pod is in CrashLoopBackOff state"
  },
  "externalURL": "http://alertmanager:9093",
  "version": "4",
  "groupKey": "{}/{}/{}:{alertname=\"PodCrashLoopBackOff\"}"
}
```

## Alertmanager Configuration

A sample Alertmanager config for local testing is provided at `monitoring/alertmanager-sample.yaml`. It routes all alerts to the webhook receiver at `http://host.docker.internal:9095/alert`.

Start Alertmanager with the sample config:

```bash
alertmanager --config.file=monitoring/alertmanager-sample.yaml
```

## Limitations

- Local process only — no systemd unit or container configuration provided
- No TLS — all communication is plaintext HTTP
- No authentication — any client can POST alerts
- No persistence guarantees — incidents are written to the local filesystem
- Not for production use — intended for development and integration testing only
