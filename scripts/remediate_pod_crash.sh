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
  "remediation_script": "remediate_pod_crash.sh",
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

log "=== remediate_pod_crash.sh started ==="
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
if [[ "${DEPLOYMENT_EXISTS}" == "true" ]]; then
    DESIRED_PODS=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo 0)
    READY_PODS=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    log "Pods: desired=${DESIRED_PODS} ready=${READY_PODS}"
fi

if [[ "${ROLLOUT_HEALTHY}" == "true" && "${READY_PODS}" -ge "${DESIRED_PODS}" && "${DESIRED_PODS}" -gt 0 ]]; then
    log "All pods ready and rollout healthy. No action required."
    write_decision "${INCIDENT_ID}" "no-action" "Deployment is healthy with ${READY_PODS}/${DESIRED_PODS} pods ready and rollout complete" "${OPERATOR_MODE}"
    log "=== remediate_pod_crash.sh completed (no-action) ==="
    exit 0
fi

if [[ "${DRY_RUN}" == "true" ]]; then
    log "[DRY-RUN] Would execute: kubectl rollout restart deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}"
    write_decision "${INCIDENT_ID}" "dry-run" "Deployment degraded (${READY_PODS}/${DESIRED_PODS} ready). Would rollout restart in dry-run mode." "dry-run"
    log "=== remediate_pod_crash.sh completed (dry-run) ==="
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

write_decision "${INCIDENT_ID}" "rollout-restart" "Deployment was degraded (${READY_PODS}/${DESIRED_PODS} ready). Performed rollout restart." "${OPERATOR_MODE}"
log "=== remediate_pod_crash.sh completed (rollout-restart) ==="
exit 0
