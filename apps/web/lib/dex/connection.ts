import { Connection } from "@solana/web3.js";

import {
  SOLANA_COMMITMENT,
  SOLANA_RPC_URL,
} from "./config";

export const solanaConnection = new Connection(
  SOLANA_RPC_URL,
  SOLANA_COMMITMENT,
);
