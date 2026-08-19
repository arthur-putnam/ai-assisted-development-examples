# Setup script for Exercise 004 - Large Code Review
# This script applies the exercise patch to create uncommitted changes for review.

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExerciseDir = $ScriptDir
$PatchFile = Join-Path $ExerciseDir ".exercise\changes.patch"

Write-Host "=== Exercise 004: Large Code Review ===" -ForegroundColor Cyan
Write-Host ""

# Verify patch file exists
if (-not (Test-Path $PatchFile)) {
    Write-Host "ERROR: Cannot find patch file at: $PatchFile" -ForegroundColor Red
    Write-Host "Make sure you run this script from the exercise-004-large-code-review directory."
    exit 1
}

# Verify git repo
try {
    $null = git rev-parse --git-dir 2>$null
    if ($LASTEXITCODE -ne 0) { throw "not a repo" }
} catch {
    Write-Host "ERROR: Not inside a git repository." -ForegroundColor Red
    exit 1
}

Write-Host "Resetting exercise to clean state..."

# Get repo root
$RepoRoot = (git rev-parse --show-toplevel).Replace("/", "\")

# Reset tracked file changes
git checkout -- "$ExerciseDir\src\" "$ExerciseDir\tests\" "$ExerciseDir\requirements.txt" 2>$null

# Remove untracked exercise files
$UntrackedFiles = @(
    "src\api\admin.py",
    "src\api\bulk.py",
    "src\api\notifications.py",
    "src\api\recurring.py",
    "src\api\transfers.py",
    "src\models\notification.py",
    "src\models\recurring.py",
    "src\services\bulk_import_service.py",
    "src\services\notification_service.py",
    "src\services\recurring_service.py",
    "src\services\transfer_service.py",
    "tests\integration\test_recurring_api.py",
    "tests\integration\test_transfers_api.py",
    "tests\unit\test_bulk_import.py",
    "tests\unit\test_notification_service.py",
    "tests\unit\test_recurring_service.py",
    "tests\unit\test_transfer_service.py"
)

foreach ($f in $UntrackedFiles) {
    $fullPath = Join-Path $ExerciseDir $f
    if (Test-Path $fullPath) {
        Remove-Item $fullPath -Force
    }
}

# Remove generated files
$dbFile = Join-Path $ExerciseDir "finance_tracker.db"
if (Test-Path $dbFile) { Remove-Item $dbFile -Force }

Write-Host "Applying exercise patch..."

# Apply the patch from repo root
Push-Location $RepoRoot
try {
    git apply $PatchFile
    if ($LASTEXITCODE -ne 0) {
        throw "Patch failed"
    }
    Write-Host ""
    Write-Host "Patch applied successfully." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to apply patch. The repository may be in an unexpected state." -ForegroundColor Red
    Write-Host "Try running: git checkout -- exercise-004-large-code-review/"
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "=== Exercise Ready ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Current git status:"
Write-Host ""

Push-Location $ExerciseDir
git status --short .
Write-Host ""
Write-Host "Changed files:"
git diff --stat .
Write-Host ""
Write-Host "You can now use your coding agent to review the uncommitted changes."
Write-Host "See EXERCISE.md for instructions."
Pop-Location
