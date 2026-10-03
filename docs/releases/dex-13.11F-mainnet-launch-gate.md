# USEFECT DEX — Mainnet Launch Gate

## 1. Release Artifact

- [x] Source commit recorded
- [x] Program ID recorded
- [x] Release binary SHA-256 recorded
- [x] LiteSVM binary hash matches release binary
- [x] API IDL hash recorded
- [x] Web IDL hash matches API IDL
- [x] DEX-13.11E release manifest committed

## 2. $USE Token Specification

### Final Supply

- Token: USE
- Total supply: 1,000,000,000 USE
- Decimals: 9
- Token standard: Original SPL Token Program
- Transfer tax: 0%
- Permanent delegate: None
- Transfer hook: None

### Final Authorities

- Mint authority: None after final mint
- Freeze authority: None after final mint

A revoked mint authority means no additional supply can be minted.
A revoked freeze authority prevents future freeze operations.

### Allocation

| Allocation | Percentage | Amount |
|---|---:|---:|
| Ecosystem & Rewards | 30% | 300,000,000 USE |
| Treasury | 20% | 200,000,000 USE |
| Liquidity | 15% | 150,000,000 USE |
| Development | 15% | 150,000,000 USE |
| Team | 10% | 100,000,000 USE |
| Community | 5% | 50,000,000 USE |
| Partnerships | 5% | 50,000,000 USE |
| **Total** | **100%** | **1,000,000,000 USE** |

Allocation is not the same as circulating supply.

## 3. Vesting / Distribution

### Team
- 12-month cliff
- 36-month linear vesting after cliff
- Total: 100,000,000 USE

### Development
- 12-month cliff
- 36-month linear vesting after cliff
- Total: 150,000,000 USE

### Partnerships
- 12-month cliff
- 24-month vesting after cliff
- Total: 50,000,000 USE

### Ecosystem & Rewards
Maximum planned release:
- Year 1: 90,000,000 USE
- Year 2: 75,000,000 USE
- Year 3: 60,000,000 USE
- Year 4: 45,000,000 USE
- Year 5: 30,000,000 USE

### Treasury
- 200,000,000 USE
- Strategic reserve
- No automatic unlock

### Community
- 50,000,000 USE
- Planned distribution over 24 months

### Liquidity
- 150,000,000 USE allocation
- Initial pool target: 100,000,000 USE
- Liquidity reserve: 50,000,000 USE

## 4. Wallet Separation

The following roles must use separate addresses:

- [ ] Deployment wallet
- [ ] Upgrade authority / multisig
- [ ] Treasury
- [ ] Initial liquidity
- [ ] Team vesting
- [ ] Development
- [ ] Ecosystem & Rewards
- [ ] Community
- [ ] Partnerships
- [ ] Protocol revenue
- [ ] Buyback / burn operations

No single operational wallet should control all sensitive functions.

## 5. Program Mainnet Gate

Program ID:

`FLYaSSPbQKzqq3BYNF7Jgn7CxPyEK7YTtr8jMmQtivfa`

Release binary:

`programs-usefect/target/deploy/programs_usefect.so`

Release binary SHA-256:

`c78c1b34c27db61168ffc493dc0a79c4e191a63d311aae1d100373eff74bd69d`

Before deployment:

- [ ] Mainnet cluster confirmed
- [ ] Deployment wallet confirmed
- [ ] Deployment wallet funded
- [ ] Program ID keypair confirmed
- [ ] Release binary re-hashed immediately before deployment
- [ ] Binary hash matches release manifest

After deployment:

- [ ] Program account exists
- [ ] ProgramData address verified
- [ ] ProgramData binary verified
- [ ] Program ID verified
- [ ] Upgrade authority verified
- [ ] Upgrade authority secured separately from deployment wallet

The program must remain upgradeable during initial Mainnet hardening.
Immutability is a later decision after sufficient production confidence.

## 6. $USE Mainnet Gate

- [ ] Mainnet mint created
- [ ] Original SPL Token Program verified
- [ ] Decimals = 9
- [ ] Total supply = 1,000,000,000 USE
- [ ] Mint authority verified
- [ ] Freeze authority verified
- [ ] Metadata verified
- [ ] No unexpected token extensions
- [ ] Allocation addresses recorded
- [ ] Vesting/distribution addresses recorded

Final authority revocation:

- [ ] Mint authority → None
- [ ] Freeze authority → None

Do not revoke final authorities until the complete mint supply and initial distribution have been independently verified.

## 7. Mainnet Pool Gate

Pair:

`USE / SOL`

Configuration:

- [ ] Mainnet USE mint verified
- [ ] Mainnet SOL mint verified
- [ ] Pool PDA verified
- [ ] Vault A verified
- [ ] Vault B verified
- [ ] LP mint verified
- [ ] LP lock PDA verified
- [ ] Pool status active
- [ ] Fee configuration verified
- [ ] Initial ratio verified
- [ ] Initial liquidity verified

Initial liquidity baseline:

- 100,000,000 USE
- Approximately $1,000 worth of SOL
- Baseline reference price: $0.00001 USE

This is a launch design baseline, not a guaranteed market price.

## 8. Mainnet Smoke Test

Execute with small controlled amounts:

1. [ ] Pool initialization
2. [ ] Initial liquidity
3. [ ] USE → SOL swap
4. [ ] SOL → USE swap
5. [ ] Add liquidity
6. [ ] Remove liquidity
7. [ ] LP lock verification
8. [ ] Transaction confirmation
9. [ ] Indexer discovery
10. [ ] PostgreSQL persistence
11. [ ] API activity response
12. [ ] Web activity display
13. [ ] DEX health endpoint
14. [ ] Error/retry behavior

## 9. Production Infrastructure

### Railway API

- [ ] Mainnet RPC configured
- [ ] Mainnet program ID configured
- [ ] Mainnet pool configured
- [ ] Mainnet network configured
- [ ] Production database isolated from Devnet data

### Railway Web

- [ ] Mainnet RPC configured
- [ ] Mainnet program ID configured
- [ ] Mainnet USE mint configured
- [ ] Mainnet SOL mint configured
- [ ] Mainnet pool configured
- [ ] Mainnet network configured

### RPC

- [ ] Production RPC selected
- [ ] Rate limits understood
- [ ] Retry handling verified
- [ ] Blockhash expiration handling verified
- [ ] Confirmation handling verified
- [ ] Fallback RPC considered

## 10. Protocol Revenue / Buyback

Target fee model:

- Pool fee: 0.30%
- LP share: 0.25%
- Protocol share: 0.05%

Protocol revenue allocation target:

- 10% buyback/burn
- 90% treasury/operations

Buyback module must remain separate from the frozen core AMM.

Required controls:

- [ ] Maximum spend
- [ ] Minimum execution threshold
- [ ] Slippage limit
- [ ] Cooldown
- [ ] Event logging
- [ ] Emergency control where implemented
- [ ] Observable burn transaction

## 11. Final Launch Decision

Mainnet launch is permitted only when all critical gates below are complete:

- [ ] Release artifact verified
- [ ] Program deployed and verified
- [ ] ProgramData verified
- [ ] Upgrade authority secured
- [ ] USE mint verified
- [ ] Supply verified
- [ ] Mint authority finalized
- [ ] Freeze authority finalized
- [ ] Pool verified
- [ ] Initial liquidity funded
- [ ] Smoke tests passed
- [ ] Indexer verified
- [ ] PostgreSQL verified
- [ ] API verified
- [ ] Web verified
- [ ] Production health verified

### Current Status

Mainnet deployment: PENDING  
Mainnet USE mint: PENDING  
Mainnet pool: PENDING  
Initial liquidity: PENDING  
Production switch: PENDING

No Mainnet deployment should be considered complete until the on-chain state is independently verified against this document and the DEX-13.11E release manifest.
