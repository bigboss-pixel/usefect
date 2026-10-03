# USEFECT — $USE Final Token Specification

## 1. Token Identity

- Symbol: USE
- Name: USEFECT
- Network: Solana Mainnet
- Token standard: Original SPL Token Program
- Decimals: 9
- Transfer tax: 0%
- Total supply: 1,000,000,000 USE

## 2. Authority Policy

Final token state:

- Mint authority: None
- Freeze authority: None
- Permanent delegate: None
- Transfer hook: None

No additional USE may be minted after final supply verification.

Mint and freeze authorities must only be revoked after:
1. Full supply has been minted.
2. Allocation has been independently verified.
3. Distribution addresses have been verified.
4. Metadata has been verified.

## 3. Allocation

| Allocation | % | Amount |
|---|---:|---:|
| Ecosystem & Rewards | 30% | 300,000,000 USE |
| Treasury | 20% | 200,000,000 USE |
| Liquidity | 15% | 150,000,000 USE |
| Development | 15% | 150,000,000 USE |
| Team | 10% | 100,000,000 USE |
| Community | 5% | 50,000,000 USE |
| Partnerships | 5% | 50,000,000 USE |
| **TOTAL** | **100%** | **1,000,000,000 USE** |

Allocation is not equivalent to circulating supply.

## 4. Vesting

### Team
- Allocation: 100,000,000 USE
- 12-month cliff
- 36-month linear vesting after cliff

### Development
- Allocation: 150,000,000 USE
- 12-month cliff
- 36-month linear vesting after cliff

### Partnerships
- Allocation: 50,000,000 USE
- 12-month cliff
- 24-month vesting after cliff

### Ecosystem & Rewards

Maximum planned release:

| Year | Maximum Release |
|---|---:|
| Year 1 | 90,000,000 USE |
| Year 2 | 75,000,000 USE |
| Year 3 | 60,000,000 USE |
| Year 4 | 45,000,000 USE |
| Year 5 | 30,000,000 USE |
| **Total** | **300,000,000 USE** |

### Treasury
- Allocation: 200,000,000 USE
- Strategic reserve
- No automatic unlock

### Community
- Allocation: 50,000,000 USE
- Planned distribution over 24 months

### Liquidity
- Allocation: 150,000,000 USE
- Initial pool target: 100,000,000 USE
- Liquidity reserve: 50,000,000 USE

## 5. Initial DEX Design Baseline

Pair:

`USE / SOL`

Initial pool baseline:

- USE: 100,000,000
- SOL: approximately $1,000 worth
- Reference starting price: $0.00001 per USE

At this reference price:

- 1,000,000,000 USE × $0.00001 = $10,000 FDV
- Initial 100,000,000 USE side = $1,000
- Matching SOL side = approximately $1,000

This is a launch design baseline, not a guaranteed market price or future valuation.

## 6. Utility

$USE is designed as a meme-style token with real utility within the USEFECT ecosystem.

Planned utility includes:

- USEFECT DEX ecosystem participation
- Liquidity
- Ecosystem rewards
- Future ecosystem utilities

A utility must only be described as active after the corresponding feature has actually been implemented and deployed.

## 7. Fee / Protocol Revenue Baseline

Target pool fee:

- Total: 0.30%
- LP portion: 0.25%
- Protocol portion: 0.05%

Protocol revenue target:

- 10% → buyback/burn operations
- 90% → treasury/operations

Buyback/burn is a separate module from the frozen core AMM.

Required controls for any future buyback implementation:

- Maximum spend
- Minimum execution threshold
- Slippage limit
- Cooldown
- Event logging
- Emergency control where implemented
- Observable burn transaction

## 8. Mainnet Verification Gate

Before finalizing the token:

- [ ] Mainnet mint address recorded
- [ ] Original SPL Token Program verified
- [ ] Decimals = 9
- [ ] Total supply = 1,000,000,000 USE
- [ ] Mint authority verified
- [ ] Freeze authority verified
- [ ] Metadata verified
- [ ] No unexpected extensions
- [ ] All allocation addresses verified
- [ ] Vesting addresses verified
- [ ] Liquidity allocation verified
- [ ] Mint authority revoked
- [ ] Freeze authority revoked
- [ ] Final token state independently verified

## 9. Current Status

Token specification: FINAL
Mainnet mint: PENDING
Mainnet distribution: PENDING
Mainnet pool: PENDING
Mainnet liquidity: PENDING
Authority revocation: PENDING

This document defines the intended final $USE configuration.
On-chain state must be independently verified against this specification before Mainnet launch.
