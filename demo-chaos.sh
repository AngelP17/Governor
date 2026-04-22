#!/bin/bash
set -euo pipefail

echo "demo-chaos.sh is deprecated. Use chaos_monkey.sh for the full incident workflow."
echo "Forwarding to chaos_monkey.sh..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/chaos_monkey.sh" "$@"
