import * as anchor from "@project-serum/anchor";
import { Program, ProgramError } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import {
  createMint,
  createAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { assert } from "chai";
import { CandyBox } from "../target/types/candy_box";
import { airDropSol, sleep } from "./utils";

describe("candy_box", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.CandyBox as Program<CandyBox>;

  const mint_keypair = Keypair.generate();
  let mint: PublicKey;
  let payer = anchor.web3.Keypair.generate();
  const trigger_key = Keypair.generate();
  const user = new NodeWallet(payer);
  const connection = program.provider.connection;
  let user_ata: PublicKey;
  const merchant = Keypair.generate();
  let merchant_ata: PublicKey;
  let sub_account: PublicKey;
  let sub_vault = Keypair.generate();

  let frequency = new anchor.BN(5); // 5 seconds
  let amount = new anchor.BN(0.1 * 10 ** 6); // 0.1 SPL
  let id = 673992;
  before("setup", async () => {
    await airDropSol(user.publicKey, 10);
    mint = await createMint(
      connection,
      payer,
      user.publicKey,
      null,
      6,
      mint_keypair
    );
    user_ata = await createAccount(connection, payer, mint, user.publicKey);
    let tx1 = await mintTo(
      connection,
      payer,
      mint,
      user_ata,
      user.publicKey,
      10 * 10 ** 6
    );
    console.log("mintTo1: ", tx1);

    merchant_ata = await createAccount(
      connection,
      payer,
      mint,
      merchant.publicKey
    );
    let tx2 = await mintTo(
      connection,
      payer,
      mint,
      merchant_ata,
      user.publicKey,
      10 * 10 ** 6
    );
    console.log("mintTo2: ", tx2);
    sub_account = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("subscription_account"), user.publicKey.toBuffer()],
      program.programId
    )[0];

    console.log("mint: ", mint.toBase58());
    console.log("mint_keypair: ", mint_keypair.publicKey.toBase58());
    console.log("user_ata: ", user_ata.toBase58());
    console.log("merchant_ata: ", merchant_ata.toBase58());
    console.log("sub_account: ", sub_account.toBase58());
    console.log("sub_vault: ", sub_vault.publicKey.toBase58());
    console.log("user: ", user.publicKey.toBase58());
    console.log("merchant: ", merchant.publicKey.toBase58());
    console.log("payer: ", payer.publicKey.toBase58());
  });

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initSubscription(
        id,
        frequency,
        amount,
        new anchor.BN(Date.now() / 10 ** 3)
      )
      .accounts({
        signer: user.publicKey,
        merchantAta: merchant_ata,
        subVault: sub_vault.publicKey,
        subAccount: sub_account,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        mint: mint,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([user.payer, sub_vault])
      .rpc();
    console.log(
      "Your transaction signature",
      `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
    );
  });
  it("deposts into the vault", async () => {
    let tx = await mintTo(
      connection,
      payer,
      mint,
      sub_vault.publicKey,
      user.publicKey,
      10 * 10 ** 6
    ); // minting instead of transfer cost for some reason transfer doesnt work
    console.log(
      "Desposit into vault",
      `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
    );
  });
  it("can trigger a subscription", async () => {
    await sleep(5000);
    await airDropSol(trigger_key.publicKey, 10);
    const tx = await program.methods
      .triggerPayment()
      .accounts({
        mint: mint,
        subVault: sub_vault.publicKey,
        signer: trigger_key.publicKey,
        subAccount: sub_account,
        userPubkey: user.publicKey,
        merchantAta: merchant_ata,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .signers([trigger_key])
      .rpc();
    console.log(
      "Your transaction signature",
      `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
    );
  });
  it("can trigger a subscription again", async () => {
    await sleep(5000);
    await airDropSol(trigger_key.publicKey, 10);
    const tx = await program.methods
      .triggerPayment()
      .accounts({
        mint: mint,
        subVault: sub_vault.publicKey,
        signer: trigger_key.publicKey,
        subAccount: sub_account,
        userPubkey: user.publicKey,
        merchantAta: merchant_ata,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .signers([trigger_key])
      .rpc();
    console.log(
      "Your transaction signature",
      `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
    );
  });
  it("cannot trigger a subscription because payment not due", async () => {
    // await sleep(5000);
    await airDropSol(trigger_key.publicKey, 10);
    try {
      const tx = await program.methods
        .triggerPayment()
        .accounts({
          mint: mint,
          subVault: sub_vault.publicKey,
          signer: trigger_key.publicKey,
          subAccount: sub_account,
          userPubkey: user.publicKey,
          merchantAta: merchant_ata,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .signers([trigger_key])
        .rpc();
      console.log(
        "Your transaction signature",
        `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
      );
    } catch (error) {
      if (
        (error as ProgramError).logs.find((x) =>
          x.includes("payment not yet due")
        ).length > 0
      ) {
        assert.ok(true);
      } else {
        assert.ok(false);
      }
    }
  });
});
