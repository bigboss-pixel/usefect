import {
  AnchorProvider,
  Program,
} from "@coral-xyz/anchor";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { Idl } from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";

import idl from "./idl/programs_usefect.json";

export function createDexProgram(
  connection: Connection,
  wallet: Pick<
    WalletContextState,
    "publicKey" | "signTransaction"
  >,
) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet is not connected");
  }

  const provider = new AnchorProvider(
    connection,
    wallet as never,
    {
      commitment: "confirmed",
    },
  );

  return new Program(
    idl as unknown as Idl,
    provider,
  );
}
