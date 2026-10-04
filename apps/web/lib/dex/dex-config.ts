import type { Idl } from "@coral-xyz/anchor";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import idl from "./idl/programs_usefect.json";
import { solanaConnection } from "./connection";
import { getDexConfigPda } from "./pdas";

const dexConfigCoder = new BorshAccountsCoder(
  idl as unknown as Idl,
);

export type DexConfigSnapshot = {
  address: PublicKey;
  authority: PublicKey;
  treasury: PublicKey;
  feeBps: number;
  protocolFeeBps: number;
  paused: boolean;
  bump: number;
};

export async function fetchDexConfig(): Promise<DexConfigSnapshot | null> {
  const [address] = getDexConfigPda();

  const account = await solanaConnection.getAccountInfo(
    address,
    "confirmed",
  );

  if (!account) {
    return null;
  }

  const decoded = dexConfigCoder.decode(
    "DexConfig",
    account.data,
  ) as {
    authority: PublicKey;
    treasury: PublicKey;
    fee_bps: number;
    protocol_fee_bps: number;
    paused: boolean;
    bump: number;
  };

  return {
    address,
    authority: decoded.authority,
    treasury: decoded.treasury,
    feeBps: decoded.fee_bps,
    protocolFeeBps: decoded.protocol_fee_bps,
    paused: decoded.paused,
    bump: decoded.bump,
  };
}
