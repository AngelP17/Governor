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
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-governor}"
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
  "remediation_script": "remediate_deployment_rollback.sh",
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

log "=== remediate_deployment_rollback.sh started ==="
log "incident_id=${INCIDENT_ID} namespace=${NAMESPACE} deployment=${DEPLOYMENT_NAME} dry_run=${DRY_RUN}"

if [[ "${DRY_RUN}" == "true" ]]; then
    OPERATOR_MODE="dry-run"
else
    OPERATOR_MODE="live"
fi

DEPLOYMENT_EXISTS=false
if kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" > /dev/null 2>&1; then
    DEPLOYMENT_EXISTS=true
    log "Deployment ${DEPLOYMENT_NAME} found in namespace ${NAMESPACE}"
else
    log "Deployment ${DEPLOYMENT_NAME} NOT found in namespace ${NAMESPACE}"
fi

ROLLOUT_HEALTHY=false
if [[ "${DEPLOYMENT_EXISTS}" == "true" ]]; then
    if kubectl rollout status "deployment/${DEPLOYMENT_NAME}" -n "${NAMESPACE}" --timeout=10s > /dev/null 2>&1; then
        ROLLOUT_HEALTHY=true
        log "Rollout status: healthy"
    else
        log "Rollout status: degraded or timed out"
    fi
fi

READY_PODS=0
DESIRED_PODS=0
AVAILABLE_REPLICAS=0
if [[ "${DEPLOYMENT_EXISTS}" == "true" ]]; then
    DESIRED_PODS=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 0)
    READY_PODS=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    AVAILABLE_REPLICAS=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo 0)
    log "Replica state: desired=${DESIRED_PODS} ready=${READY_PODS} available=${AVAILABLE_REPLICAS}"
fi

ROLLOUT_HISTORY=""
if [[ "${DEPLOYMENT_EXISTS}" == "true" ]]; then
    ROLLOUT_HISTORY=$(kubectl rollout history "deployment/${DEPLOYMENT_NAME}" -n "${NAMESPACE}" 2>/dev/null || echo "unavailable")
    log "Rollout history captured"
fi

if [[ "${ROLLOUT_HEALTHY}" == "true" && "${AVAILABLE_REPLICAS}" -ge "${DESIRED_PODS}" && "${DESIRED_PODS}" -gt 0 ]]; then
    log "Rollout healthy and replicas available. No action required."
    write_decision "${INCIDENT_ID}" "no-action" "Deployment healthy with ${AVAILABLE_REPLICAS}/${DESIRED_PODS} available replicas and rollout complete" "${OPERATOR_MODE}"
    log "=== remediate_deployment_rollback.sh completed (no-action) ==="
    exit 0
fi

if [[ "${DRY_RUN}" == "true" ]]; then
    log "[DRY-RUN] Would execute: kubectl rollout undo deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}"
    write_decision "${INCIDENT_ID}" "dry-run" "Deployment degraded (ready=${READY_PODS}/${DESIRED_PODS}, available=${AVAILABLE_REPLICAS}). Would rollback in dry-run mode." "dry-run"
    log "=== remediate_deployment_rollback.sh completed (dry-run) ==="
    exit 0
fi

log "Executing: kubectl rollout undo deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}"
kubectl rollout undo "deployment/${DEPLOYMENT_NAME}" -n "${NAMESPACE}"
log "Rollback initiated. Waiting for rollout to complete..."

SECONDS_WAITED=0
while [[ ${SECONDS_WAITED} -lt 60 ]]; do
    if kubectl rollout status "deployment/${DEPLOYMENT_NAME}" -n "${NAMESPACE}" --timeout=5s > /dev/null 2>&1; then
        log "Rollback completed successfully after ${SECONDS_WAITED}s"
        break
    fi
    SECONDS_WAITED=$((SECONDS_WAITED + 5))
done

if [[ ${SECONDS_WAITED} -ge 60 ]]; then
    log "Warning: Rollback did not complete within 60s but undo was initiated"
fi

FINAL_READY=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
FINAL_AVAILABLE=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo 0)
log "Final state: desired=${DESIRED_PODS} ready=${FINAL_READY} available=${FINAL_AVAILABLE}"

write_decision "${INCIDENT_ID}" "rollback" "Deployment was degraded (ready=${READY_PODS}/${DESIRED_PODS}, available=${AVAILABLE_REPLICAS}). Performed rollback to previous revision." "${OPERATOR_MODE}"
log "=== remediate_deployment_rollback.sh completed (rollback) ==="
exit 0
