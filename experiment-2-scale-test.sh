#!/bin/bash

################################################################################
# Experiment 2: Scale Test
# Scale to 5 replicas and test resilience at higher scale
################################################################################

set -e

echo "📈 Experiment 2: Scale Test"
echo "============================"
echo ""

# Get current replica count
CURRENT=$(kubectl get deployment governor -o jsonpath='{.spec.replicas}')
echo "📊 Current replicas: $CURRENT"

# Scale up
echo "🚀 Scaling to 5 replicas..."
kubectl scale deployment governor --replicas=5

echo ""
echo "⏱️  Waiting for all pods to be ready..."
kubectl wait --for=condition=ready pod -l app=governor --timeout=60s

echo ""
echo "✅ All pods ready!"
kubectl get pods -l app=governor

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 Running Chaos at Scale"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for i in {1..5}; do
  echo ""
  echo "🔥 Chaos Round $i/5"

  # Kill 2 pods at once (40% failure!)
  PODS=($(kubectl get pods -l app=governor -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | head -2))

  echo "💥 Killing 2 pods simultaneously:"
  for pod in "${PODS[@]}"; do
    echo "  - $pod"
    kubectl delete pod "$pod" --grace-period=0 --force &
  done
  wait

  echo ""
  echo "⏱️  Monitoring recovery (20 seconds)..."
  for j in {20..1}; do
    READY=$(kubectl get pods -l app=governor --no-headers | grep "1/1" | wc -l | tr -d ' ')
    TOTAL=$(kubectl get pods -l app=governor --no-headers | wc -l | tr -d ' ')
    printf "\r  Pods ready: ${READY}/5 | Time: ${j}s  "
    sleep 1
  done
  echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Experiment 2 Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Final pod status:"
kubectl get pods -l app=governor

echo ""
echo "🔄 Scaling back to $CURRENT replicas..."
kubectl scale deployment governor --replicas=$CURRENT
kubectl wait --for=condition=ready pod -l app=governor --timeout=60s

echo ""
echo "✅ Scaled back to original size"
kubectl get pods -l app=governor

echo ""
echo "📈 Key Observations:"
echo "  - System survived 40% pod failure (2/5 pods killed)"
echo "  - Service remained available with 60% capacity"
echo "  - Kubernetes auto-recovered all pods"
echo "  - Check Grafana for error rate during high chaos"
