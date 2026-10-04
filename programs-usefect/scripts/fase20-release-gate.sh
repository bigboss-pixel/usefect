#!/bin/bash

set -euo pipefail

echo ""
echo "=============================================="
echo " USEFECT DEX — FASE 20 RELEASE GATE"
echo "=============================================="
echo ""

echo "[1/6] Checking workspace..."
cargo metadata --no-deps --format-version 1 >/dev/null
echo "      OK"

echo ""
echo "[2/6] Building SBF artifact..."
cargo build-sbf
echo "      OK"

echo ""
echo "[3/6] Preparing LiteSVM artifact..."
cp target/deploy/programs_usefect.so \
   target/deploy/programs_usefect_litesvm.so
echo "      OK"

echo ""
echo "[4/6] Running regression suite..."

TESTS=(
  "test_add_liquidity"
  "test_swap"
  "test_graduate_launch"
  "test_hardening"
)

for TEST in "${TESTS[@]}"; do
  echo ""
  echo "      >>> $TEST"
  cargo test --test "$TEST"
done

echo ""
echo "[5/6] Verifying release artifact..."

ARTIFACT="target/deploy/programs_usefect.so"

if [ ! -f "$ARTIFACT" ]; then
  echo "ERROR: SBF artifact tidak ditemukan."
  exit 1
fi

SIZE=$(stat -f%z "$ARTIFACT")
SHA256=$(shasum -a 256 "$ARTIFACT" | awk '{print $1}')

echo "      Artifact : $ARTIFACT"
echo "      Size     : ${SIZE} bytes"
echo "      SHA-256  : $SHA256"

if [ "$SIZE" -le 0 ]; then
  echo "ERROR: Artifact kosong."
  exit 1
fi

echo ""
echo "[6/6] Final release invariants..."
echo "      Build artifact exists        : PASS"
echo "      LiteSVM artifact prepared    : PASS"
echo "      LP economics regression       : PASS"
echo "      Swap regression               : PASS"
echo "      Launch/graduation regression  : PASS"
echo "      Admin/security regression    : PASS"

echo ""
echo "=============================================="
echo " DEX RELEASE GATE: PASSED"
echo "=============================================="
echo ""
echo "Program ID:"
echo "FLYaSSPbQKzqq3BYNF7Jgn7CxPyEK7YTtr8jMmQtivfa"
echo ""
echo "Artifact SHA-256:"
echo "$SHA256"
echo ""
echo "FASE 20 RELEASE GATE PASSED."
echo "=============================================="
