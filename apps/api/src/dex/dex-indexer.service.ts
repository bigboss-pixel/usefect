import { Injectable } from '@nestjs/common';
import {
  BorshAccountsCoder,
  BorshInstructionCoder,
} from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

import idl from './idl/programs_usefect.json' with { type: 'json' };
import { db } from '../prisma/db.js';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required DEX environment variable: ${name}`,
    );
  }

  return value;
}

const PROGRAM_ID = new PublicKey(
  requireEnv('DEX_PROGRAM_ID'),
);

const RPC_URL = requireEnv(
  'DEX_SOLANA_RPC_URL',
);

const KNOWN_POOL_ADDRESS = new PublicKey(
  requireEnv('DEX_KNOWN_POOL_ADDRESS'),
);

const DEX_NETWORK =
  process.env['DEX_NETWORK'] ?? 'devnet';

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

type TokenTransfer = {
  source: string;
  destination: string;
  mint: string;
  amount: string;
  authority: string;
};

type TokenMint = {
  account: string;
  mint: string;
  amount: string;
  mintAuthority: string;
};

type TokenBurn = {
  account: string;
  mint: string;
  amount: string;
  authority: string;
};

function decodeBase58(value: string): Uint8Array {
  const bytes = [0];

  for (const char of value) {
    const digit = BASE58_ALPHABET.indexOf(char);

    if (digit < 0) {
      throw new Error(`Invalid base58 character: ${char}`);
    }

    let carry = digit;

    for (let index = 0; index < bytes.length; index += 1) {
      const current = bytes[index] * 58 + carry;
      bytes[index] = current & 0xff;
      carry = current >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeroes = 0;

  for (const char of value) {
    if (char !== '1') {
      break;
    }

    leadingZeroes += 1;
  }

  const result = new Uint8Array(
    leadingZeroes + bytes.length,
  );

  for (let index = 0; index < bytes.length; index += 1) {
    result[result.length - 1 - index] = bytes[index];
  }

  return result;
}

type DecodedPool = {
  dex: PublicKey;
  token_a: PublicKey;
  token_b: PublicKey;
  vault_a: PublicKey;
  vault_b: PublicKey;
  lp_mint: PublicKey;
  reserve_a: bigint | { toString(): string };
  reserve_b: bigint | { toString(): string };
  lp_supply: bigint | { toString(): string };
  fee_bps: number;
  token_a_decimals: number;
  token_b_decimals: number;
  status: number;
  bump: number;
};

@Injectable()
export class DexIndexerService {
  private readonly connection = new Connection(
    RPC_URL,
    'confirmed',
  );

  private readonly coder = new BorshAccountsCoder(
    idl as unknown as Idl,
  );

  private readonly instructionCoder =
    new BorshInstructionCoder(idl as unknown as Idl);

  async discoverKnownPool() {
    const account =
      await this.connection.getAccountInfo(
        KNOWN_POOL_ADDRESS,
        'confirmed',
      );

    if (!account) {
      throw new Error(
        `Pool account not found: ${KNOWN_POOL_ADDRESS.toBase58()}`,
      );
    }

    const decoded = this.coder.decode(
      'Pool',
      account.data,
    ) as unknown as DecodedPool;

    const slot = await this.connection.getSlot(
      'confirmed',
    );

    const blockTime =
      await this.connection.getBlockTime(slot);

    return {
      poolAddress: KNOWN_POOL_ADDRESS.toBase58(),
      dexAddress: decoded.dex.toBase58(),

      tokenA: decoded.token_a.toBase58(),
      tokenB: decoded.token_b.toBase58(),

      vaultA: decoded.vault_a.toBase58(),
      vaultB: decoded.vault_b.toBase58(),

      lpMint: decoded.lp_mint.toBase58(),

      reserveA: decoded.reserve_a.toString(),
      reserveB: decoded.reserve_b.toString(),
      lpSupply: decoded.lp_supply.toString(),

      feeBps: decoded.fee_bps,
      tokenADecimals: decoded.token_a_decimals,
      tokenBDecimals: decoded.token_b_decimals,

      status: decoded.status,
      bump: decoded.bump,

      slot: String(slot),
      blockTime,
      programId: PROGRAM_ID.toBase58(),
      network:
        DEX_NETWORK,
    };
  }

  async syncKnownPool() {
    const pool = await this.discoverKnownPool();

    const existing = await db.orm.public.DexPool.where({
      poolAddress: pool.poolAddress,
    }).first();

    const data = {
      poolAddress: pool.poolAddress,
      dexAddress: pool.dexAddress,
      tokenA: pool.tokenA,
      tokenB: pool.tokenB,
      vaultA: pool.vaultA,
      vaultB: pool.vaultB,
      lpMint: pool.lpMint,
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      lpSupply: pool.lpSupply,
      feeBps: pool.feeBps,
      tokenADecimals: pool.tokenADecimals,
      tokenBDecimals: pool.tokenBDecimals,
      status: pool.status,
      slot: pool.slot,
      blockTime: pool.blockTime
        ? new Date(pool.blockTime * 1000).toISOString()
        : null,
    };

    let persistedPool;
    let action: 'created' | 'updated';

    if (!existing) {
      persistedPool =
        await db.orm.public.DexPool.create(data);
      action = 'created';
    } else {
      persistedPool =
        await db.orm.public.DexPool
          .where({
            poolAddress: pool.poolAddress,
          })
          .update(data);
      action = 'updated';
    }

    return {
      action,
      pool: persistedPool,
    };
  }

  private extractTokenMovements(
    transaction: Awaited<
      ReturnType<
        Connection['getParsedTransaction']
      >
    >,
  ): {
    transfers: TokenTransfer[];
    mints: TokenMint[];
    burns: TokenBurn[];
  } {
    const transfers: TokenTransfer[] = [];
    const mints: TokenMint[] = [];
    const burns: TokenBurn[] = [];

    const innerInstructions =
      transaction?.meta?.innerInstructions ?? [];

    for (const group of innerInstructions) {
      for (const instruction of group.instructions) {
        if (!('parsed' in instruction)) {
          continue;
        }

        const parsed = instruction.parsed;

        if (!parsed || !parsed.info) {
          continue;
        }

        if (parsed.type === 'transferChecked') {
          const info = parsed.info as {
            source?: string;
            destination?: string;
            mint?: string;
            authority?: string;
            tokenAmount?: {
              amount?: string;
            };
          };

          if (
            typeof info.source !== 'string' ||
            typeof info.destination !== 'string' ||
            typeof info.mint !== 'string' ||
            typeof info.authority !== 'string' ||
            typeof info.tokenAmount?.amount !== 'string'
          ) {
            continue;
          }

          transfers.push({
            source: info.source,
            destination: info.destination,
            mint: info.mint,
            amount: info.tokenAmount.amount,
            authority: info.authority,
          });

          continue;
        }

        if (parsed.type === 'mintTo') {
          const info = parsed.info as {
            account?: string;
            mint?: string;
            amount?: string;
            mintAuthority?: string;
          };

          if (
            typeof info.account !== 'string' ||
            typeof info.mint !== 'string' ||
            typeof info.amount !== 'string' ||
            typeof info.mintAuthority !== 'string'
          ) {
            continue;
          }

          mints.push({
            account: info.account,
            mint: info.mint,
            amount: info.amount,
            mintAuthority: info.mintAuthority,
          });

          continue;
        }

        if (parsed.type === 'burn') {
          const info = parsed.info as {
            account?: string;
            mint?: string;
            amount?: string;
            authority?: string;
          };

          if (
            typeof info.account !== 'string' ||
            typeof info.mint !== 'string' ||
            typeof info.amount !== 'string' ||
            typeof info.authority !== 'string'
          ) {
            continue;
          }

          burns.push({
            account: info.account,
            mint: info.mint,
            amount: info.amount,
            authority: info.authority,
          });
        }
      }
    }

    return {
      transfers,
      mints,
      burns,
    };
  }

  async discoverTransactions(
    limit = 20,
    checkpoint?: string,
  ) {
    const pageSize = Math.min(
      Math.max(limit, 1),
      100,
    );

    const results = [];
    let before: string | undefined;
    let checkpointFound = !checkpoint;

    while (true) {
      const signatures =
        await this.connection.getSignaturesForAddress(
          KNOWN_POOL_ADDRESS,
          {
            limit: pageSize,
            ...(before ? { before } : {}),
          },
          'confirmed',
        );

      if (signatures.length === 0) {
        break;
      }

      for (const signature of signatures) {
        if (signature.signature === checkpoint) {
          checkpointFound = true;
          break;
        }

        const transaction =
          await this.connection.getParsedTransaction(
            signature.signature,
            {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            },
          );

        if (!transaction) {
          continue;
        }

        const instructions = [];

        for (
          const instruction of
          transaction.transaction.message.instructions
        ) {
          if (!('programId' in instruction)) {
            continue;
          }

          if (!instruction.programId.equals(PROGRAM_ID)) {
            continue;
          }

          if (!('data' in instruction)) {
            continue;
          }

          try {
            const raw = decodeBase58(
              instruction.data,
            );

            if (raw.length < 8) {
              continue;
            }

            const discriminator = Buffer.from(
              raw.subarray(0, 8),
            ).toString('hex');

            const instructionDefinition =
              (
                idl as unknown as Idl
              ).instructions?.find(
                (item) =>
                  Buffer.from(
                    item.discriminator ?? [],
                  ).toString('hex') ===
                  discriminator,
              );

            if (!instructionDefinition) {
              instructions.push({
                name: 'unknown',
              });
              continue;
            }

            const args =
              this.decodeInstructionArgs(
                instructionDefinition.name,
                raw.subarray(8),
              );

            instructions.push({
              name: instructionDefinition.name,
              args,
            });
          } catch {
            instructions.push({
              name: 'unknown',
            });
          }
        }

        if (instructions.length === 0) {
          continue;
        }

        const userAddress =
          transaction.transaction.message
            .accountKeys
            .find((account) => account.signer)
            ?.pubkey.toBase58() ?? null;

        results.push({
          signature: signature.signature,
          slot: String(signature.slot),
          blockTime:
            typeof signature.blockTime ===
            'number'
              ? new Date(
                  signature.blockTime * 1000,
                ).toISOString()
              : null,
          err: signature.err,
          poolAddress:
            KNOWN_POOL_ADDRESS.toBase58(),
          userAddress,
          instructions,
          ...this.extractTokenMovements(
            transaction,
          ),
        });
      }

      if (checkpointFound) {
        break;
      }

      if (signatures.length < pageSize) {
        break;
      }

      before =
        signatures[signatures.length - 1]
          ?.signature;

      if (!before) {
        break;
      }
    }

    return results;
  }

  private decodeInstructionArgs(
    instructionName: string,
    data: Uint8Array,
  ) {
    const readU64 = (offset: number): string => {
      if (offset + 8 > data.length) {
        throw new Error(
          `Invalid ${instructionName} instruction data`,
        );
      }

      let value = 0n;

      for (let index = 0; index < 8; index += 1) {
        value |=
          BigInt(data[offset + index]) <<
          (8n * BigInt(index));
      }

      return value.toString();
    };

    switch (instructionName) {
      case 'swap':
        if (data.length < 17) {
          throw new Error('Invalid swap instruction data');
        }

        return {
          amountIn: readU64(0),
          amountOutMinimum: readU64(8),
          aToB: data[16] === 1,
        };

      case 'add_liquidity':
        if (data.length < 16) {
          throw new Error(
            'Invalid add_liquidity instruction data',
          );
        }

        return {
          amountA: readU64(0),
          amountB: readU64(8),
        };

      case 'remove_liquidity':
        if (data.length < 8) {
          throw new Error(
            'Invalid remove_liquidity instruction data',
          );
        }

        return {
          lpAmount: readU64(0),
        };

      default:
        return {};
    }
  }

  async syncTransactions(limit = 20) {
    const indexerState =
      await db.orm.public.DexIndexerState.where({
        programId: PROGRAM_ID.toBase58(),
      }).first();

    const checkpoint =
      indexerState?.lastProcessedSignature ?? undefined;

    const discovered =
      await this.discoverTransactions(
        limit,
        checkpoint,
      );

    const persisted = [];
    const skipped = [];

    for (const transaction of discovered) {
      if (transaction.err !== null) {
        skipped.push({
          signature: transaction.signature,
          reason: 'transaction_failed',
        });
        continue;
      }

      const instruction = transaction.instructions.find(
        (item) =>
          item.name === 'swap' ||
          item.name === 'add_liquidity' ||
          item.name === 'remove_liquidity',
      );

      if (!instruction) {
        skipped.push({
          signature: transaction.signature,
          reason: 'unsupported_instruction',
        });
        continue;
      }

      const pool =
        await db.orm.public.DexPool.where({
          poolAddress: transaction.poolAddress,
        }).first();

      if (!pool) {
        skipped.push({
          signature: transaction.signature,
          reason: 'pool_not_indexed',
        });
        continue;
      }

      const existing =
        await db.orm.public.DexTransaction.where({
          signature: transaction.signature,
        }).first();

      const transfers = transaction.transfers;
      const mints = transaction.mints;

      let type: string;
      let tokenIn: string | null = null;
      let tokenOut: string | null = null;
      let amountIn: string | null = null;
      let amountOut: string | null = null;

      let tokenA: string | null = null;
      let amountA: string | null = null;
      let tokenB: string | null = null;
      let amountB: string | null = null;
      let lpMint: string | null = null;
      let lpAmount: string | null = null;

      const tokenATransfers = transfers.filter(
        (transfer) =>
          transfer.mint === pool.tokenA,
      );

      const tokenBTransfers = transfers.filter(
        (transfer) =>
          transfer.mint === pool.tokenB,
      );

      if (instruction.name === 'swap') {
        type = 'SWAP';

        const args = instruction.args as Record<
          string,
          unknown
        >;

        const aToB = args.aToB === true;

        tokenIn = aToB
          ? pool.tokenA
          : pool.tokenB;

        tokenOut = aToB
          ? pool.tokenB
          : pool.tokenA;

        const inputMint = tokenIn;
        const outputMint = tokenOut;

        const inputTransfers =
          transfers.filter(
            (transfer) =>
              transfer.mint === inputMint &&
              transfer.authority ===
                transaction.userAddress &&
              (
                transfer.destination ===
                  pool.vaultA ||
                transfer.destination ===
                  pool.vaultB
              ),
          );

        const outputTransfers =
          transfers.filter(
            (transfer) =>
              transfer.mint === outputMint &&
              transfer.authority ===
                transaction.poolAddress &&
              (
                transfer.source ===
                  pool.vaultA ||
                transfer.source ===
                  pool.vaultB
              ),
          );

        amountIn =
          inputTransfers.length > 0
            ? inputTransfers
                .reduce(
                  (total, transfer) =>
                    total +
                    BigInt(transfer.amount),
                  0n,
                )
                .toString()
            : null;

        amountOut =
          outputTransfers.length > 0
            ? outputTransfers
                .reduce(
                  (total, transfer) =>
                    total +
                    BigInt(transfer.amount),
                  0n,
                )
                .toString()
            : null;
      } else if (
        instruction.name === 'add_liquidity'
      ) {
        type = 'ADD_LIQUIDITY';

        const inputA = tokenATransfers.filter(
          (transfer) =>
            transfer.authority ===
              transaction.userAddress &&
            transfer.destination ===
              pool.vaultA,
        );

        const inputB = tokenBTransfers.filter(
          (transfer) =>
            transfer.authority ===
              transaction.userAddress &&
            transfer.destination ===
              pool.vaultB,
        );

        amountA =
          inputA.length > 0
            ? inputA
                .reduce(
                  (total, transfer) =>
                    total +
                    BigInt(transfer.amount),
                  0n,
                )
                .toString()
            : null;

        amountB =
          inputB.length > 0
            ? inputB
                .reduce(
                  (total, transfer) =>
                    total +
                    BigInt(transfer.amount),
                  0n,
                )
                .toString()
            : null;

        tokenA =
          amountA !== null
            ? pool.tokenA
            : null;

        tokenB =
          amountB !== null
            ? pool.tokenB
            : null;

        const lpMints = mints.filter(
          (mint) =>
            mint.mint === pool.lpMint &&
            mint.mintAuthority ===
              transaction.poolAddress &&
            mint.account !==
              'HZFzNT3HVgrptLEjyxdX9jPfUdz8UiAQZHo9GKD6FgA2',
        );

        if (lpMints.length > 0) {
          lpMint = pool.lpMint;

          lpAmount =
            lpMints
              .reduce(
                (total, mint) =>
                  total +
                  BigInt(mint.amount),
                0n,
              )
              .toString();
        }
      } else {
        type = 'REMOVE_LIQUIDITY';

        const outputA = tokenATransfers.filter(
          (transfer) =>
            transfer.source === pool.vaultA &&
            transfer.destination !==
              pool.vaultA,
        );

        const outputB = tokenBTransfers.filter(
          (transfer) =>
            transfer.source === pool.vaultB &&
            transfer.destination !==
              pool.vaultB,
        );

        amountA =
          outputA.length > 0
            ? outputA
                .reduce(
                  (total, transfer) =>
                    total +
                    BigInt(transfer.amount),
                  0n,
                )
                .toString()
            : null;

        amountB =
          outputB.length > 0
            ? outputB
                .reduce(
                  (total, transfer) =>
                    total +
                    BigInt(transfer.amount),
                  0n,
                )
                .toString()
            : null;

        tokenA =
          amountA !== null
            ? pool.tokenA
            : null;

        tokenB =
          amountB !== null
            ? pool.tokenB
            : null;

        const lpBurns =
          transaction.burns ?? [];

        const userLpBurns = lpBurns.filter(
          (burn) =>
            burn.mint === pool.lpMint &&
            burn.authority ===
              transaction.userAddress,
        );

        if (userLpBurns.length > 0) {
          lpMint = pool.lpMint;

          lpAmount =
            userLpBurns
              .reduce(
                (total, burn) =>
                  total +
                  BigInt(burn.amount),
                0n,
              )
              .toString();
        }
      }

      const transactionData = {
        signature: transaction.signature,
        type,
        poolId: pool.id,
        poolAddress: transaction.poolAddress,
        userAddress:
          transaction.userAddress ??
          '11111111111111111111111111111111',
        slot: transaction.slot,
        blockTime: transaction.blockTime,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        tokenA,
        amountA,
        tokenB,
        amountB,
        lpMint,
        lpAmount,
      };

      if (existing) {
        const updated =
          await db.orm.public.DexTransaction
            .where({
              signature: transaction.signature,
            })
            .update(transactionData);

        persisted.push(updated);
      } else {
        const created =
          await db.orm.public.DexTransaction.create(
            transactionData,
          );

        persisted.push(created);
      }
    }

    const latest = discovered
      .filter((item) => item.err === null)
      .sort((a, b) => {
        const slotA = BigInt(a.slot);
        const slotB = BigInt(b.slot);

        if (slotA === slotB) {
          return 0;
        }

        return slotA > slotB ? -1 : 1;
      })[0];

    if (latest) {
      const currentSlot = indexerState
        ? BigInt(indexerState.lastProcessedSlot)
        : 0n;

      const latestSlot = BigInt(latest.slot);

      if (!indexerState || latestSlot > currentSlot) {
        const stateData = {
          programId: PROGRAM_ID.toBase58(),
          network:
            DEX_NETWORK,
          lastProcessedSlot: latest.slot,
          lastProcessedSignature:
            latest.signature,
        };

        if (!indexerState) {
          await db.orm.public.DexIndexerState.create(
            stateData,
          );
        } else {
          await db.orm.public.DexIndexerState
            .where({
              programId: PROGRAM_ID.toBase58(),
            })
            .update(stateData);
        }
      }
    }

    return {
      discovered: discovered.length,
      persisted: persisted.length,
      skipped,
      transactions: persisted,
    };
  }

  async getIndexerDatabaseState() {
    return db.orm.public.DexIndexerState.all();
  }
}
