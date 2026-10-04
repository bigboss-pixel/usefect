#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXPECTED_PROGRAM_ID="FLYaSSPbQKzqq3BYNF7Jgn7CxPyEK7YTtr8jMmQtivfa"
ARTIFACT="target/deploy/programs_usefect_mainnet-release.so"
PROGRAM_KEYPAIR="target/deploy/programs_usefect-keypair.json"

echo "========================================"
echo "USEFECT DEX — FASE 31 MAINNET GATE"
echo "========================================"

echo
echo "[1/7] Checking program keypair..."

if [[ ! -f "$PROGRAM_KEYPAIR" ]]; then
  echo "FAIL: program keypair not found:"
  echo "  $PROGRAM_KEYPAIR"
  exit 1
fi

ACTUAL_PROGRAM_ID="$(solana address -k "$PROGRAM_KEYPAIR")"

if [[ "$ACTUAL_PROGRAM_ID" != "$EXPECTED_PROGRAM_ID" ]]; then
  echo "FAIL: Program ID mismatch"
  echo "Expected: $EXPECTED_PROGRAM_ID"
  echo "Actual:   $ACTUAL_PROGRAM_ID"
  exit 1
fi

echo "PASS: Program ID $ACTUAL_PROGRAM_ID"

echo
echo "[2/7] Building SBF release..."
cargo build-sbf

echo
echo "[3/7] Creating mainnet release artifact..."
cp target/deploy/programs_usefect.so "$ARTIFACT"

if [[ ! -s "$ARTIFACT" ]]; then
  echo "FAIL: release artifact is empty"
  exit 1
fi

echo "PASS: $ARTIFACT"

echo
echo "[4/7] Calculating SHA-256..."
SHA256="$(shasum -a 256 "$ARTIFACT" | awk '{print $1}')"
SIZE="$(stat -f%z "$ARTIFACT")"

echo "Artifact size: $SIZE bytes"
echo "SHA-256:       $SHA256"

echo
echo "[5/7] Checking private-key protection..."

if git check-ignore -q "$PROGRAM_KEYPAIR"; then
  echo "PASS: program keypair is ignored by Git"
else
  echo "WARNING: program keypair is NOT ignored by Git"
  echo "Do NOT commit it."
fi

echo
echo "[6/7] Checking release manifest..."

if [[ ! -f release/dex-mainnet-release.env ]]; then
  echo "FAIL: release/dex-mainnet-release.env missing"
  exit 1
fi

echo "PASS: release manifest exists"

echo
echo "[7/7] Release fingerprint"

printf '%s\n' \
  "PROGRAM_ID=$EXPECTED_PROGRAM_ID" \
  "NETWORK=mainnet-beta" \
  "ARTIFACT=$ARTIFACT" \
  "ARTIFACT_SIZE=$SIZE" \
  "SHA256=$SHA256"

echo
echo "========================================"
echo "MAINNET PRE-DEPLOYMENT GATE: PASSED"
echo "========================================"
echo
echo "NO MAINNET DEPLOYMENT WAS PERFORMED."
echo "Actual deployment requires the final RPC,"
echo "deployer authority, and final pool/token addresses."
