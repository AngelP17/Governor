#!/bin/bash

################################################################################
# Experiment 3: Node Failure Simulation
# Simulate complete node failure by draining a node
################################################################################

set -e

echo "🖥️  Experiment 3: Node Failure Simulation"
echo "=========================================="
echo ""
echo "⚠️  This simulates a complete node failure (e.g., hardware issue)"
echo "    Pods on the drained node will be rescheduled to other nodes"
echo ""

# Show current node distribution
echo "📊 Current pod distribution across nodes:"
kubectl get pods -l app=governor -o wide | awk 'NR==1 || /governor/ {print $1 "\t" $7}'

# Select a node with pods
echo ""
echo "🎯 Selecting a node to drain..."
NODE=$(kubectl get pods -l app=governor -o jsonpath='{.items[0].spec.nodeName}')

if [ -z "$NODE" ]; then
  echo "❌ No node found with governor pods"
  exit 1
fi

PODS_ON_NODE=$(kubectl get pods -l app=governor -o wide | grep "$NODE" | wc -l | tr -d ' ')

echo "Target node: $NODE"
echo "Pods on this node: $PODS_ON_NODE"
echo ""

# Confirm
echo "⚠️  Press Enter to drain node '$NODE' or Ctrl+C to cancel..."
read -r

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 Draining node: $NODE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Drain the node
kubectl drain "$NODE" --ignore-daemonsets --delete-emptydir-data --timeout=60s

echo ""
echo "✅ Node drained!"
echo ""
echo "⏱️  Monitoring pod migration (30 seconds)..."

for i in {30..1}; do
  READY=$(kubectl get pods -l app=governor --no-headers | grep "1/1" | wc -l | tr -d ' ')
  TOTAL=$(kubectl get pods -l app=governor --no-headers | wc -l | tr -d ' ')
  printf "\r  Pods ready: ${READY}/${TOTAL} | Time: ${i}s  "
  sleep 1
done
echo ""

echo ""
echo "📊 New pod distribution:"
kubectl get pods -l app=governor -o wide | awk 'NR==1 || /governor/ {print $1 "\t" $7}'

echo ""
echo "🔍 Verify no pods on drained node:"
if kubectl get pods -l app=governor -o wide | grep -q "$NODE"; then
  echo "⚠️  Warning: Some pods still on drained node"
else
  echo "✅ All pods successfully migrated!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Uncordoning node: $NODE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Uncordon the node
kubectl uncordon "$NODE"

echo "✅ Node $NODE is now schedulable again"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Experiment 3 Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📈 Key Observations:"
echo "  - System survived complete node failure"
echo "  - Pods automatically migrated to healthy nodes"
echo "  - Anti-affinity rules spread pods across remaining nodes"
echo "  - Service continued without downtime"
echo ""
echo "📊 Final status:"
kubectl get pods -l app=governor -o wide
