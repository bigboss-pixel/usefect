import {
  getAccount,
  getMint,
} from "@solana/spl-token";
import {
  PublicKey,
} from "@solana/web3.js";

import { solanaConnection } from "./connection";

export type WalletTokenBalance = {
  mint: PublicKey;
  decimals: number;
  amount: bigint;
  uiAmount: string;
};

export async function fetchWalletTokenBalance(
  owner: PublicKey,
  mint: PublicKey,
): Promise<WalletTokenBalance> {
  const mintInfo = await getMint(
    solanaConnection,
    mint,
    "confirmed",
  );

  const tokenAccounts =
    await solanaConnection.getTokenAccountsByOwner(
      owner,
      { mint },
      "confirmed",
    );

  let amount = BigInt(0);

  for (const account of tokenAccounts.value) {
    const tokenAccount = await getAccount(
      solanaConnection,
      account.pubkey,
      "confirmed",
    );

    amount += tokenAccount.amount;
  }

  const base = BigInt(10) ** BigInt(mintInfo.decimals);
  const integerPart = amount / base;
  const fractionalPart = amount % base;

  let uiAmount = integerPart.toString();

  if (fractionalPart > BigInt(0)) {
    const fraction = fractionalPart
      .toString()
      .padStart(mintInfo.decimals, "0")
      .replace(/0+$/, "");

    uiAmount += `.${fraction}`;
  }

  return {
    mint,
    decimals: mintInfo.decimals,
    amount,
    uiAmount,
  };
}


export async function fetchMintDecimals(
  mint: PublicKey,
): Promise<number> {
  const mintInfo = await getMint(
    solanaConnection,
    mint,
    "confirmed",
  );

  return mintInfo.decimals;
}
