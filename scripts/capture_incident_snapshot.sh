#!/bin/bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-default}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-resilience-pilot}"
APP_LABEL="${APP_LABEL:-app=${DEPLOYMENT_NAME}}"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <output-directory>" >&2
    echo "  Captures Kubernetes incident context into the specified directory." >&2
    echo "  Environment variables:" >&2
    echo "    NAMESPACE        - Kubernetes namespace (default: default)" >&2
    echo "    DEPLOYMENT_NAME  - Deployment name (default: resilience-pilot)" >&2
    echo "    APP_LABEL        - Label selector (default: app=\${DEPLOYMENT_NAME})" >&2
    exit 1
fi

OUT_DIR="$1"

mkdir -p "$OUT_DIR"

echo "[snapshot] Capturing incident context → $OUT_DIR" >&2
echo "[snapshot] Namespace: $NAMESPACE | Deployment: $DEPLOYMENT_NAME | Label: $APP_LABEL" >&2

echo "[snapshot] Capturing pods..." >&2
kubectl get pods -n "$NAMESPACE" -l "$APP_LABEL" -o wide > "$OUT_DIR/pods.txt" 2>&1 || true

echo "[snapshot] Capturing workloads..." >&2
kubectl get deploy,rs -n "$NAMESPACE" -l "$APP_LABEL" > "$OUT_DIR/workloads.txt" 2>&1 || true

echo "[snapshot] Capturing events..." >&2
kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' 2>&1 | tail -50 > "$OUT_DIR/events.txt" || true

echo "[snapshot] Capturing pod descriptions..." >&2
POD_NAMES=$(kubectl get pods -n "$NAMESPACE" -l "$APP_LABEL" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || true)
> "$OUT_DIR/pod-describe.txt"
for POD in $POD_NAMES; do
    echo "=== Pod: $POD ===" >> "$OUT_DIR/pod-describe.txt"
    kubectl describe pod "$POD" -n "$NAMESPACE" >> "$OUT_DIR/pod-describe.txt" 2>&1 || true
    echo "" >> "$OUT_DIR/pod-describe.txt"
done

echo "[snapshot] Capturing application logs..." >&2
kubectl logs -n "$NAMESPACE" -l "$APP_LABEL" --tail=100 --previous 2>/dev/null > "$OUT_DIR/app-logs.txt" || \
    kubectl logs -n "$NAMESPACE" -l "$APP_LABEL" --tail=100 > "$OUT_DIR/app-logs.txt" 2>&1 || true

echo "[snapshot] Capturing pod resources..." >&2
kubectl top pods -n "$NAMESPACE" -l "$APP_LABEL" > "$OUT_DIR/pod-resources.txt" 2>&1 || \
    echo "metrics-server not available or no pods found" > "$OUT_DIR/pod-resources.txt"

echo "[snapshot] Capturing node resources..." >&2
kubectl top nodes > "$OUT_DIR/node-resources.txt" 2>&1 || \
    echo "metrics-server not available" > "$OUT_DIR/node-resources.txt"

CAPTURED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "$OUT_DIR/metadata.json" <<EOF
{"captured_at": "${CAPTURED_AT}", "namespace": "${NAMESPACE}", "deployment": "${DEPLOYMENT_NAME}", "app_label": "${APP_LABEL}"}
EOF

echo "[snapshot] Done. Artifacts written to $OUT_DIR:" >&2
ls -1 "$OUT_DIR" >&2
