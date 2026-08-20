# Setup/reset script for Exercise 007 - Debugging with Terminal Context
#
# This script installs dependencies and resets the exercise to its starting state.
# Run this to begin (or restart) the exercise.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "=== Exercise 007: Debugging with Terminal Context ===" -ForegroundColor Cyan
Write-Host ""

# Install dependencies
Write-Host "[1/2] Installing dependencies..."
pip install -r requirements.txt --quiet
Write-Host "      Done."

# Clean up any generated artifacts
Write-Host "[2/2] Cleaning up generated artifacts..."
if (Test-Path "reports") { Remove-Item -Recurse -Force "reports" }
if (Test-Path "__pycache__") { Remove-Item -Recurse -Force "__pycache__" }
if (Test-Path "src/__pycache__") { Remove-Item -Recurse -Force "src/__pycache__" }
if (Test-Path "tests/__pycache__") { Remove-Item -Recurse -Force "tests/__pycache__" }
if (Test-Path ".pytest_cache") { Remove-Item -Recurse -Force ".pytest_cache" }
if (Test-Path ".hypothesis") { Remove-Item -Recurse -Force ".hypothesis" }
Write-Host "      Done."

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "To begin the exercise:"
Write-Host "  1. Run: python main.py"
Write-Host "  2. Observe the crash"
Write-Host "  3. Open EXERCISE.md for instructions"
Write-Host ""
