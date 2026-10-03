# USEFECT DEX — Mainnet Execution Runbook

## Purpose

This runbook defines the exact execution order for USEFECT DEX Mainnet deployment.

No step should be skipped.

Mainnet transactions use real SOL and are irreversible where authority is permanently revoked.

---

# PHASE A — Preflight

## A1. Repository

- [ ] Working tree reviewed
- [ ] Release commit identified
- [ ] DEX-13.11E release manifest verified
- [ ] DEX-13.11F launch gate verified
- [ ] USE token specification verified
- [ ] Latest program binary hash verified

## A2. Program

Program ID:

`FLYaSSPbQKzqq3BYNF7Jgn7CxPyEK7YTtr8jMmQtivfa`

Release binary:

`programs-usefect/target/deploy/programs_usefect.so`

Expected SHA-256:

`c78c1b34c27db61168ffc493dc0a79c4e191a63d311aae1d100373eff74bd69d`

Before deployment:

```bash
shasum -a 256 programs-usefect/target/deploy/programs_usefect.so
