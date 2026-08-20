#!/usr/bin/env bash
# Setup/reset script for Exercise 007 - Debugging with Terminal Context
#
# This script installs dependencies and resets the exercise to its starting state.
# Run this to begin (or restart) the exercise.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Exercise 007: Debugging with Terminal Context ==="
echo ""

# Install dependencies
echo "[1/2] Installing dependencies..."
pip install -r requirements.txt --quiet
echo "      Done."

# Clean up any generated artifacts
echo "[2/2] Cleaning up generated artifacts..."
rm -rf reports/
rm -rf __pycache__ src/__pycache__ tests/__pycache__
rm -rf .pytest_cache .hypothesis
echo "      Done."

echo ""
echo "=== Setup complete ==="
echo ""
echo "To begin the exercise:"
echo "  1. Run: python main.py"
echo "  2. Observe the crash"
echo "  3. Open EXERCISE.md for instructions"
echo ""
