#!/usr/bin/env bash
# Setup script for Exercise 004 - Large Code Review
# This script applies the exercise patch to create uncommitted changes for review.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXERCISE_DIR="$SCRIPT_DIR"
PATCH_FILE="$EXERCISE_DIR/.exercise/changes.patch"

echo "=== Exercise 004: Large Code Review ==="
echo ""

# Verify we're in the right directory
if [ ! -f "$PATCH_FILE" ]; then
    echo "ERROR: Cannot find patch file at: $PATCH_FILE"
    echo "Make sure you run this script from the exercise-004-large-code-review directory."
    exit 1
fi

# Verify git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "ERROR: Not inside a git repository."
    exit 1
fi

echo "Resetting exercise to clean state..."

# Get the repo root
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Reset any tracked file changes within this exercise
git checkout -- "$EXERCISE_DIR/src/" "$EXERCISE_DIR/tests/" "$EXERCISE_DIR/requirements.txt" 2>/dev/null || true

# Remove untracked exercise files (new files from the patch)
# Be careful to only remove known generated paths, not .exercise/
UNTRACKED_DIRS=(
    "$EXERCISE_DIR/src/api/admin.py"
    "$EXERCISE_DIR/src/api/bulk.py"
    "$EXERCISE_DIR/src/api/notifications.py"
    "$EXERCISE_DIR/src/api/recurring.py"
    "$EXERCISE_DIR/src/api/transfers.py"
    "$EXERCISE_DIR/src/models/notification.py"
    "$EXERCISE_DIR/src/models/recurring.py"
    "$EXERCISE_DIR/src/services/bulk_import_service.py"
    "$EXERCISE_DIR/src/services/notification_service.py"
    "$EXERCISE_DIR/src/services/recurring_service.py"
    "$EXERCISE_DIR/src/services/transfer_service.py"
    "$EXERCISE_DIR/tests/integration/test_recurring_api.py"
    "$EXERCISE_DIR/tests/integration/test_transfers_api.py"
    "$EXERCISE_DIR/tests/unit/test_bulk_import.py"
    "$EXERCISE_DIR/tests/unit/test_notification_service.py"
    "$EXERCISE_DIR/tests/unit/test_recurring_service.py"
    "$EXERCISE_DIR/tests/unit/test_transfer_service.py"
)

for f in "${UNTRACKED_DIRS[@]}"; do
    rm -f "$f"
done

# Remove any generated database files
rm -f "$EXERCISE_DIR/finance_tracker.db"
rm -f "$EXERCISE_DIR/.hypothesis" 2>/dev/null || true
rm -rf "$EXERCISE_DIR/__pycache__" "$EXERCISE_DIR/src/__pycache__" 2>/dev/null || true

echo "Applying exercise patch..."

# Apply the patch from repo root
cd "$REPO_ROOT"
if git apply "$PATCH_FILE"; then
    echo ""
    echo "Patch applied successfully."
else
    echo ""
    echo "ERROR: Failed to apply patch. The repository may be in an unexpected state."
    echo "Try running: git checkout -- exercise-004-large-code-review/"
    exit 1
fi

echo ""
echo "=== Exercise Ready ==="
echo ""
echo "Current git status:"
echo ""
cd "$EXERCISE_DIR"
git status --short .
echo ""
echo "Changed files:"
git diff --stat .
echo ""
echo "You can now use your coding agent to review the uncommitted changes."
echo "See EXERCISE.md for instructions."
