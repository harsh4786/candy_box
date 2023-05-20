import {
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import { assert } from "chai";
export const airDropSol = async (to: PublicKey, amt?: number) => {
  try {
    const connection = new Connection(clusterApiUrl("testnet"), {
      commitment: "confirmed",
    });
    const fromAirDropSignature = await connection.requestAirdrop(
      to,
      1 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(fromAirDropSignature);
    console.log("🪂 airdropped!", fromAirDropSignature);
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
