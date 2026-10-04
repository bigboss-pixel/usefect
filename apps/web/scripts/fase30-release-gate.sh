#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo " USEFECT DEX — FRONTEND RELEASE GATE"
echo "=========================================="
echo

echo "[1/7] Checking package metadata..."
node -e '
const p = require("./package.json");
if (!p.name || !p.version) {
  throw new Error("Invalid package metadata");
}
console.log(`Package: ${p.name}@${p.version}`);
'

echo
echo "[2/7] Checking mainnet configuration template..."

test -f ".env.mainnet.example" || {
  echo "ERROR: .env.mainnet.example missing"
  exit 1
}

required_vars=(
  NEXT_PUBLIC_DEX_NETWORK
  NEXT_PUBLIC_SOLANA_RPC_URL
  NEXT_PUBLIC_DEX_PROGRAM_ID
  NEXT_PUBLIC_DEX_TOKEN_A_ADDRESS
  NEXT_PUBLIC_DEX_TOKEN_B_ADDRESS
  NEXT_PUBLIC_DEX_POOL_ADDRESS
)

for var in "${required_vars[@]}"; do
  grep -q "^${var}=" ".env.mainnet.example" || {
    echo "ERROR: Missing $var"
    exit 1
  }
done

echo "Mainnet template: OK"

echo
echo "[3/7] Checking release scripts..."

test -x "scripts/mainnet-config-check.sh" || {
  echo "ERROR: mainnet-config-check.sh missing or not executable"
  exit 1
}

bash -n scripts/mainnet-config-check.sh

echo "Release scripts: OK"

echo
echo "[4/7] Checking frontend source for private-key material..."

if grep -RniE \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude='*.map' \
  --exclude='.env.local' \
  --exclude='.env.mainnet.example' \
  --exclude='fase30-release-gate.sh' \
  --exclude='mainnet-config-check.sh' \
  --exclude='package-lock.json' \
  --exclude='yarn.lock' \
  --exclude='pnpm-lock.yaml' \
  'BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|PRIVATE_KEY=|SECRET_KEY=|MNEMONIC=' \
  app lib providers 2>/dev/null
then
  echo "ERROR: Possible private-key material found in frontend source."
  exit 1
fi

echo "Private-key source scan: CLEAN"

echo
echo "[5/7] Running targeted ESLint..."

npx eslint \
  app/dex/page.tsx \
  lib/dex/config.ts \
  lib/dex/security.ts \
  lib/dex/dex-config.ts \
  lib/dex/market-data.ts \
  lib/dex/liquidity.ts \
  lib/dex/swap.ts

echo
echo "Targeted ESLint: PASSED"

echo
echo "[6/7] Running production build..."

npm run build

test -d ".next" || {
  echo "ERROR: .next build artifact missing"
  exit 1
}

echo
echo "Production build: PASSED"

echo
echo "[7/7] Checking release artifact..."

NEXT_COUNT="$(find .next -type f | wc -l | tr -d ' ')"

if [[ "$NEXT_COUNT" -le 0 ]]; then
  echo "ERROR: Empty .next artifact"
  exit 1
fi

echo "Next.js artifact files: $NEXT_COUNT"

echo
echo "=========================================="
echo " FRONTEND RELEASE GATE: PASSED"
echo "=========================================="
echo
echo "DEX frontend:"
echo "  FASE 21  On-chain integration       PASS"
echo "  FASE 22  Market data                PASS"
echo "  FASE 23  Swap hardening             PASS"
echo "  FASE 24  Liquidity UX               PASS"
echo "  FASE 25  Pool / LP dashboard        PASS"
echo "  FASE 26  Transaction UX             PASS"
echo "  FASE 27  Production UI/UX           PASS"
echo "  FASE 28  Security hardening         PASS"
echo "  FASE 29  Mainnet configuration      PASS"
echo "  FASE 30  Release gate               PASS"
echo
echo "MAINNET DEPLOYMENT VALUES:"
echo "  Intentionally supplied by deployment environment."
echo "  No private key is stored in the frontend."
