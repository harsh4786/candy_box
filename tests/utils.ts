import { PublicKey, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
export const airDropSol = async (to: PublicKey, amt?: number) => {
  try {
    const connection = new Connection("http://localhost:8899", "confirmed");
    const fromAirDropSignature = await connection.requestAirdrop(
      to,
      (amt || 2) * LAMPORTS_PER_SOL
    );
    const ar_tx = await connection.confirmTransaction(fromAirDropSignature);
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
