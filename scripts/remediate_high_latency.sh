#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo "Usage: $0 <INCIDENT_DIR>"
    echo "  INCIDENT_DIR  Path to the incident directory containing context files"
    exit 1
}

if [[ $# -lt 1 ]]; then
    usage
fi

INCIDENT_DIR="$1"

if [[ ! -d "${INCIDENT_DIR}" ]]; then
    echo "Error: INCIDENT_DIR '${INCIDENT_DIR}' is not a valid directory"
    usage
fi

NAMESPACE="${NAMESPACE:-default}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-resilience-pilot}"
DRY_RUN="${DRY_RUN:-false}"

LOG_FILE="${INCIDENT_DIR}/remediation.log"
DECISION_FILE="${INCIDENT_DIR}/remediation-decision.json"

log() {
    local msg
    msg="$(date -u '+%Y-%m-%dT%H:%M:%SZ') $*"
    echo "${msg}" >> "${LOG_FILE}"
}

write_decision() {
    local incident_id="$1"
    local decision="$2"
    local reason="$3"
    local operator_mode="$4"
    local ts
    ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    cat > "${DECISION_FILE}" <<DEOF
{
  "incident_id": "${incident_id}",
  "remediation_script": "remediate_high_latency.sh",
  "decision": "${decision}",
  "reason": "${reason}",
  "operator_mode": "${operator_mode}",
  "timestamp_utc": "${ts}"
}
DEOF
}

resolve_incident_id() {
    local result_file="${INCIDENT_DIR}/result.json"
    if [[ -f "${result_file}" ]]; then
        python3 -c "
import json, sys
with open('${result_file}') as f:
    data = json.load(f)
print(data.get('incident_id', '$(basename "${INCIDENT_DIR}")'))
" 2>/dev/null || basename "${INCIDENT_DIR}"
    else
        basename "${INCIDENT_DIR}"
    fi
}

INCIDENT_ID="$(resolve_incident_id)"

log "=== remediate_high_latency.sh started ==="
log "incident_id=${INCIDENT_ID} namespace=${NAMESPACE} deployment=${DEPLOYMENT_NAME} dry_run=${DRY_RUN}"

if [[ "${DRY_RUN}" == "true" ]]; then
    OPERATOR_MODE="dry-run"
else
    OPERATOR_MODE="live"
fi

HEALTH_ENDPOINT="http://localhost:8080/health"
LATENCY_OK=true
RESPONSE_TIME=""
HEALTH_CHECK_AVAILABLE=false

RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' --connect-timeout 5 --max-time 10 "${HEALTH_ENDPOINT}" 2>/dev/null) && HEALTH_CHECK_AVAILABLE=true || {
    HEALTH_CHECK_AVAILABLE=false
    log "Health endpoint ${HEALTH_ENDPOINT} unavailable. Skipping latency check."
}

if [[ "${HEALTH_CHECK_AVAILABLE}" == "true" ]]; then
    log "Health check response time: ${RESPONSE_TIME}s"
    LATENCY_THRESHOLD=2.0
    RESPONSE_TIME_NUMERIC=$(echo "${RESPONSE_TIME}" | awk '{printf "%.3f", $1}')
    if (( $(echo "${RESPONSE_TIME_NUMERIC} > ${LATENCY_THRESHOLD}" | bc -l 2>/dev/null || echo 0) )); then
        LATENCY_OK=false
        log "Latency degraded: ${RESPONSE_TIME}s exceeds threshold ${LATENCY_THRESHOLD}s"
    else
        log "Latency within threshold: ${RESPONSE_TIME}s"
    fi
fi

RESOURCE_DATA=""
if kubectl top pods -n "${NAMESPACE}" > /dev/null 2>&1; then
    RESOURCE_DATA=$(kubectl top pods -n "${NAMESPACE}" --no-headers 2>/dev/null | grep "${DEPLOYMENT_NAME}" || true)
    log "Pod resource usage: ${RESOURCE_DATA:-none captured}"
else
    log "kubectl top pods unavailable. Skipping resource check."
fi

READY_PODS=0
DESIRED_PODS=0
DEPLOYMENT_EXISTS=false
if kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" > /dev/null 2>&1; then
    DEPLOYMENT_EXISTS=true
    DESIRED_PODS=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 0)
    READY_PODS=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    log "Replica state: desired=${DESIRED_PODS} ready=${READY_PODS}"
else
    log "Deployment ${DEPLOYMENT_NAME} not found in namespace ${NAMESPACE}"
fi

REPLICAS_OK=true
if [[ "${DEPLOYMENT_EXISTS}" == "true" && "${READY_PODS}" -lt "${DESIRED_PODS}" ]]; then
    REPLICAS_OK=false
    log "Replica count degraded: ${READY_PODS}/${DESIRED_PODS}"
fi

if [[ "${LATENCY_OK}" == "true" && "${REPLICAS_OK}" == "true" ]]; then
    log "Latency and replicas healthy. No action required."
    write_decision "${INCIDENT_ID}" "no-action" "Latency OK (${RESPONSE_TIME}s) and replicas healthy (${READY_PODS}/${DESIRED_PODS})" "${OPERATOR_MODE}"
    log "=== remediate_high_latency.sh completed (no-action) ==="
    exit 0
fi

DEGRADED_REASON=""
if [[ "${LATENCY_OK}" == "false" ]]; then
    DEGRADED_REASON="High latency detected: ${RESPONSE_TIME}s"
fi
if [[ "${REPLICAS_OK}" == "false" ]]; then
    if [[ -n "${DEGRADED_REASON}" ]]; then
        DEGRADED_REASON="${DEGRADED_REASON}; "
    fi
    DEGRADED_REASON="${DEGRADED_REASON}Replica shortage: ${READY_PODS}/${DESIRED_PODS}"
fi

if [[ "${DRY_RUN}" == "true" ]]; then
    log "[DRY-RUN] Would execute: kubectl rollout restart deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}"
    write_decision "${INCIDENT_ID}" "dry-run" "${DEGRADED_REASON}. Would rollout restart in dry-run mode." "dry-run"
    log "=== remediate_high_latency.sh completed (dry-run) ==="
    exit 0
fi

log "Executing: kubectl rollout restart deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}"
kubectl rollout restart "deployment/${DEPLOYMENT_NAME}" -n "${NAMESPACE}"
log "Rollout restart initiated. Waiting up to 60s for pods to be ready..."

SECONDS_WAITED=0
while [[ ${SECONDS_WAITED} -lt 60 ]]; do
    if kubectl rollout status "deployment/${DEPLOYMENT_NAME}" -n "${NAMESPACE}" --timeout=5s > /dev/null 2>&1; then
        log "Rollout completed successfully after ${SECONDS_WAITED}s"
        break
    fi
    SECONDS_WAITED=$((SECONDS_WAITED + 5))
done

if [[ ${SECONDS_WAITED} -ge 60 ]]; then
    log "Warning: Rollout did not complete within 60s but restart was initiated"
fi

FINAL_READY=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
log "Final pod state: desired=${DESIRED_PODS} ready=${FINAL_READY}"

write_decision "${INCIDENT_ID}" "rollout-restart" "${DEGRADED_REASON}. Performed rollout restart." "${OPERATOR_MODE}"
log "=== remediate_high_latency.sh completed (rollout-restart) ==="
exit 0
