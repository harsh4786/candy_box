import {
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { getAccount, transfer } from "@solana/spl-token";
import { assert } from "chai";
import fs from "fs";
export const airDropSol = async (to: PublicKey, amt?: number) => {
  try {
    const pk = fs.readFileSync("tests/id.json", {
      encoding: "utf-8",
    });

    const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(pk)));
    const connection = new Connection(clusterApiUrl("devnet"), {
      commitment: "confirmed",
    });
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: to,
        lamports: amt === 1 ? 1.3 * LAMPORTS_PER_SOL : 0.3 * LAMPORTS_PER_SOL, // number of SOL to send
      })
    );

    // Sign transaction, broadcast, and confirm
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer],
      {
        commitment: "confirmed",
      }
    );

    console.log("🪂 airdropped!", signature);
  } catch (er) {
    console.log("Error Here: " + er);
  }
};

export const BN = (n: number) => new anchor.BN(n);

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const bps = (percentage: number) => {
  return percentage * 100;
};

export const print_thread = async (clockworkProvider, address, cluster) => {
  const threadAccount = await clockworkProvider.getThreadAccount(address);
  console.log("\nThread: ", threadAccount, "\n");
  print_address("🧵 Thread", address, cluster);
  console.log("\n");
};

export const print_address = (label, address, cluster: Cluster) => {
  console.log(
    `${label}: https://explorer.solana.com/address/${address}?cluster=${cluster}`
  );
};

export const print_tx = (label, address, cluster: Cluster) => {
  console.log(
    `${label}: https://explorer.solana.com/tx/${address}?cluster=${cluster}`
  );
};

export enum Cluster {
  MAINNET = "mainnet-beta",
  DEVNET = "devnet",
  TESTNET = "testnet",
  LOCALNET = "custom&customUrl=http://localhost:8899",
}

export const verifyAmount = async (connection, ata, expectedAmount) => {
  const amount = (await getAccount(connection, ata)).amount;
  assert.equal(amount.toString(), expectedAmount.toString());
  return amount;
};

export const calculateCutWithBps = (amount, bps) => {
  return amount * (bps / 10000);
};

export const CANDY_BOX_V1 = "CD8QX7UQSSHWzKbZbMGVbqVnGqiJWqupjdDMHwyvchbR";
