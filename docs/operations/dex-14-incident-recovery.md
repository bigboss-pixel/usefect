# USEFECT DEX — Incident & Recovery Procedure

## 1. Purpose

This document defines the operational response procedure for incidents affecting the
USEFECT DEX production system.

The procedure covers:

- Solana RPC failure
- DEX pool unavailable
- Indexer degradation
- Indexer lag
- API failure
- Database failure
- Web application failure
- Transaction confirmation problems
- Production configuration mistakes

The procedure is intended to restore service without modifying the frozen AMM core
unless a separate engineering decision is made.

---

## 2. System Components

Production flow:

```text
User
  ↓
USEFECT Web
  ↓
USEFECT API
  ↓
Solana RPC
  ↓
USEFECT DEX Program
  ↓
Solana Mainnet
