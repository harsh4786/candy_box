import * as anchor from "@project-serum/anchor";
import { Program, ProgramError } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import {
  createMint,
  createAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
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
import { ClockworkProvider, PAYER_PUBKEY } from "@clockwork-xyz/sdk";
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
  let subscription_account: PublicKey;
  /// the ATA to pay for clockwork
  let candyTokenAccount: PublicKey;
  let subscription_vault = Keypair.generate();
  const candy_bank_wallet = Keypair.generate();
  const candy_payer = Keypair.generate();
  let interval = new anchor.BN(5); // 5 seconds
  let decimals = 6; // USDC decimals
  let price = new anchor.BN(0.1 * 10 ** decimals); // 0.1 SPL
  let id = anchor.web3.Keypair.generate().publicKey.toBuffer();
  let candyCut = new anchor.BN(0.5 * 100); // 0.1 SPL
  before("setup", async () => {
    await airDropSol(user.publicKey, 10);
    await airDropSol(merchant.publicKey, 10);
    await airDropSol(candy_payer.publicKey, 10);
    mint = await createMint(
      connection,
      payer,
      user.publicKey,
      null,
      decimals,
      mint_keypair
    );
    user_ata = await createAccount(connection, payer, mint, user.publicKey);
    let tx1 = await mintTo(
      connection,
      payer,
      mint,
      user_ata,
      user.publicKey,
      10 * 10 ** decimals
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
      10 * 10 ** decimals
    );
    console.log("mintTo2: ", tx2);

    subscription_account = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("subscription"), user.publicKey.toBuffer(), id],
      program.programId
    )[0];

    candyTokenAccount = getAssociatedTokenAddressSync(
      mint,
      candy_payer.publicKey
    );
    console.log("mint: ", mint.toBase58());
    console.log("mint_keypair: ", mint_keypair.publicKey.toBase58());
    console.log("user_ata: ", user_ata.toBase58());
    console.log("merchant_ata: ", merchant_ata.toBase58());
    console.log("subscription_account: ", subscription_account.toBase58());
    console.log(
      "subscription_vault: ",
      subscription_vault.publicKey.toBase58()
    );
    console.log("user: ", user.publicKey.toBase58());
    console.log("merchant: ", merchant.publicKey.toBase58());
    console.log("payer: ", payer.publicKey.toBase58());
    console.log("subscription id: ", id.toString("hex"));
  });

  it("Is initialized!", async () => {
    let initializationTime = new anchor.BN(Date.now() / 1000);
    let args = {
      id: [...Uint8Array.from(id)],
      initializationTime,
      interval,
      price,
      candyCut,
    };
    const tx = await program.methods
      .createSubscription(args)
      .accounts({
        mint: mint,
        signer: user.publicKey,
        merchant: merchant.publicKey,
        subscriptionVault: subscription_vault.publicKey,
        subscriptionAccount: subscription_account,
        candyPayer: candy_payer.publicKey,
        candyBankWallet: candy_bank_wallet.publicKey,
        candyTokenAccount,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([user.payer, subscription_vault, candy_payer]) // add subscrtiption vault if needed
      .rpc();
    console.log(
      "Your transaction signature",
      `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
    );
  });
  it.skip("deposts into the vault", async () => {
    let tx = await mintTo(
      connection,
      payer,
      mint,
      subscription_vault.publicKey,
      user.publicKey,
      10 * 10 ** 6
    ); // minting instead of transfer cost for some reason transfer doesnt work
    console.log(
      "Desposit into vault",
      `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
    );
  });
  it.skip("can trigger a subscription", async () => {
    await sleep(5000);
    await airDropSol(trigger_key.publicKey, 10);
    const tx = "";

    console.log(
      "Your transaction signature",
      `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
    );
  });
  it.skip("can trigger a subscription again", async () => {
    await sleep(5000);
    await airDropSol(trigger_key.publicKey, 10);
    const tx = "";
    console.log(
      "Your transaction signature",
      `https://explorer.solana.com/tx/${tx}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
    );
  });
  it.skip("cannot trigger a subscription because payment not due", async () => {
    // await sleep(5000);
    await airDropSol(trigger_key.publicKey, 10);
    try {
      const tx = "";
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
