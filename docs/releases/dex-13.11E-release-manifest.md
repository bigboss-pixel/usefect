# USEFECT DEX Release Manifest

## Release

- Stage: DEX-13.11E
- Network: Devnet validation / Mainnet preparation
- Source commit: `1464cb3b3fb0e87cdbcfa3429d7350927e5890e5`
- Program ID: `FLYaSSPbQKzqq3BYNF7Jgn7CxPyEK7YTtr8jMmQtivfa`

## Program Artifact

- Release binary:
  `programs-usefect/target/deploy/programs_usefect.so`
- SHA-256:
  `c78c1b34c27db61168ffc493dc0a79c4e191a63d311aae1d100373eff74bd69d`

## LiteSVM Artifact

- Binary:
  `programs-usefect/target/deploy/programs_usefect_litesvm.so`
- SHA-256:
  `c78c1b34c27db61168ffc493dc0a79c4e191a63d311aae1d100373eff74bd69d`

## IDL

### API

- File:
  `apps/api/src/dex/idl/programs_usefect.json`
- SHA-256:
  `1c57c5fb0da631dd4a6e6a2b33fac5236319014264e7caac08ac1c91cfb07139`

### Web

- File:
  `apps/web/lib/dex/idl/programs_usefect.json`
- SHA-256:
  `1c57c5fb0da631dd4a6e6a2b33fac5236319014264e7caac08ac1c91cfb07139`

## Verification

- Program binary and LiteSVM binary hashes match: YES
- API and Web IDL hashes match: YES
- Program ID recorded: YES
- Source commit recorded: YES

## Mainnet Deployment Status

- Mainnet deployment: NOT DEPLOYED
- Mainnet program verification: PENDING
- Mainnet ProgramData verification: PENDING
- Mainnet upgrade authority verification: PENDING
- Mainnet token mint: PENDING
- Mainnet pool: PENDING
- Mainnet initial liquidity: PENDING

## Rule

The recorded release binary must be treated as the deployment artifact for this release. Any rebuilt binary must be re-hashed and recorded as a new release artifact.
