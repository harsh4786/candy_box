import * as anchor from "@project-serum/anchor";
import { AnchorProvider, Program, ProgramError } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import {
  createMint,
  createAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  transfer,
  transferChecked,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { assert } from "chai";
import { CandyBox } from "../target/types/candy_box";
import {
  airDropSol,
  BN,
  bps,
  calculateCutWithBps,
  CANDY_BOX_V1,
  Cluster,
  print_thread,
  sleep,
  verifyAmount,
} from "./utils";
import idl from "../target/idl/candy_box.json";
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
  console.log("Connection: ", connection.rpcEndpoint);
  let user_ata: PublicKey;
  const merchant = Keypair.generate();
  let merchant_ata: PublicKey;
  let subscription_account: PublicKey;
  /// the ATA to pay for clockwork
  let candyTokenAccount: PublicKey;
  let subscription_vault = Keypair.generate();
  const candy_bank_wallet = Keypair.generate();
  let candy_bank_wallet_ata: PublicKey;
  const candy_payer = Keypair.generate();
  let interval = new anchor.BN(10); // 5 seconds
  let decimals = 6; // USDC decimals
  let price = new anchor.BN(8 * 10 ** decimals); // 0.1 SPL
  let id = anchor.web3.Keypair.generate().publicKey.toBuffer();
  // let candyCut = new anchor.BN(0.5 * 100);
  let candyCut = 0.5 * 100; // 0.5 %
  const cronExpression = "*/10 * * * * * *"; // for some reason same cron with 60 secs doesn't work

  const provider = anchor.AnchorProvider.env();
  const clockworkProvider = new ClockworkProvider(
    provider.wallet,
    provider.connection
  );
  const cluster = Cluster.DEVNET;
  before("setup", async () => {
    console.log("Setting up...");
    await airDropSol(user.publicKey, 10);
    await sleep(1000);
    await airDropSol(merchant.publicKey, 10);
    await sleep(1000);
    await airDropSol(candy_payer.publicKey, 1);
    await sleep(1000);
    await airDropSol(candy_bank_wallet.publicKey, 10);
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
      20000 * 10 ** decimals
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
      20000 * 10 ** decimals
    );
    console.log("mintTo2: ", tx2);

    subscription_account = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("subscription"), user.publicKey.toBuffer(), id],
      program.programId
    )[0];

    candyTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        candy_payer,
        mint,
        candy_payer.publicKey
      )
    ).address;
    candy_bank_wallet_ata = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        candy_bank_wallet,
        mint,
        candy_bank_wallet.publicKey
      )
    ).address;
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
    console.log("candyTokenAccount: ", candyTokenAccount.toBase58());
    console.log("candy_bank_wallet_ata: ", candy_bank_wallet_ata.toBase58());
    console.log("candy_payer: ", candy_payer.publicKey.toBase58());
    console.log("candy_bank_wallet: ", candy_bank_wallet.publicKey.toBase58());
  });
  it.skip("get info", async () => {
    // hardcode for testing
    const mint = new PublicKey("D1vnDkW2EyNimtdX4MKUUSmBBeN6bsxF2GPMVUVMQC9o");
    const merchant = new PublicKey(
      "EMB13ex1XPU3BSivPw7MrkMcQYj1iqJQX5My7zd1dsqb"
    );
    const deriveATA = getAssociatedTokenAddressSync(mint, merchant);
    const info = await program.account.subscription.fetch(
      "APNL6fUKDq5XKGxmdAE1LYbSWNNsVbfTFUhvEnt6toVx"
    );
    console.log("subscription_account.merchant: ", info.merchant.toBase58());
    console.log(
      "derived token account", //@ts-ignore
      (await connection.getParsedAccountInfo(deriveATA)).value.data.parsed.info
    );
  });
  it.skip("Listen to events", async () => {
    let listenerOne = null;
    const program = new Program(idl as anchor.Idl, CANDY_BOX_V1, provider);
    let [eventOne, slotOne] = await new Promise((resolve, _reject) => {
      listenerOne = program.addEventListener("Disbursed", (event, slot) => {
        resolve([event, slot]);
      });
    });
    console.log("eventOne: ", eventOne, "slot:", slotOne);
  });
  it("User creates subscription for 1 year", async () => {
    let initializationTime = new anchor.BN(Date.now() / 1000);
    let terminationTime = new anchor.BN(Date.now() / 1000 + 60 * 60 * 24 * 365);
    let args = {
      id: [...Uint8Array.from(id)],
      initializationTime,
      interval,
      price,
      candyCut,
      terminationTime,
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
      `https://explorer.solana.com/tx/${tx}?cluster=${cluster}`
    );
  });
  it("User deposits 10000 USDC into the vault", async () => {
    let tx = await transferChecked(
      connection,
      payer,
      user_ata,
      mint,
      subscription_vault.publicKey,
      user.publicKey,
      10000 * 10 ** decimals,
      decimals
    );
    console.log(
      "Desposit into vault",
      `https://explorer.solana.com/tx/${tx}?cluster=${cluster}`
    );
  });
  it("creates the clockwork thread to start the subscription", async () => {
    const thread = await createDisbursePaymentThread(
      clockworkProvider,
      candy_payer,
      program,
      merchant_ata,
      candyTokenAccount,
      subscription_vault,
      subscription_account,
      mint,
      candy_bank_wallet_ata,
      cronExpression,
      cluster,
      id
    );
    console.log("Thread created: ", thread.toBase58());
    await waitForThreadExec(clockworkProvider, thread);
    let merchantShouldReceive = price.sub(
      BN(calculateCutWithBps(price, candyCut))
    );
    const merchantAmt = await verifyAmount(
      connection,
      merchant_ata,
      merchantShouldReceive
    );
    console.log("Merchant has received amount: ", merchantAmt);
    const candyPayAmt = await verifyAmount(
      connection,
      candy_bank_wallet_ata,
      BN(calculateCutWithBps(price, candyCut))
    );
    console.log("CandyPay has received amount: ", candyPayAmt);
  });
});

const createDisbursePaymentThread = async (
  clockworkProvider: ClockworkProvider,
  candy_payer: anchor.web3.Keypair,
  program: anchor.Program<CandyBox>,
  merchant_ata: anchor.web3.PublicKey,
  candyTokenAccount: anchor.web3.PublicKey,
  subscription_vault: anchor.web3.Keypair,
  subscription_account: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey,
  candy_bank_wallet_ata: anchor.web3.PublicKey,
  cronExpression: string,
  cluster: Cluster,
  sub_id: Buffer
) => {
  // const threadId = "subscription_thread";
  // For debug: use a fix thread id such as the above, when your code works!
  const date = new Date();
  const threadId =
    "subscription_" +
    date.toLocaleDateString() +
    "-" +
    date.getHours() +
    ":" +
    date.getMinutes();

  // Security:
  // Note that we are using your default Solana paper keypair as the thread authority.
  // Feel free to use whichever authority is appropriate for your use case.
  const threadAuthority = candy_payer.publicKey;
  const [threadAddress] = clockworkProvider.getThreadPDA(
    threadAuthority,
    threadId
  );
  console.log("threadAddress", threadAddress.toBase58());
  // https://docs.rs/clockwork-utils/latest/clockwork_utils/static.PAYER_PUBKEY.html
  const clockwork_payer = PAYER_PUBKEY;

  const targetIx = await program.methods
    .disburse([...Uint8Array.from(sub_id)])
    .accounts({
      mint: mint,
      subscriptionVault: subscription_vault.publicKey,
      subscriptionAccount: subscription_account,
      merchantAta: merchant_ata,
      thread: threadAddress,
      signer: clockwork_payer,
      candyBankWalletAta: candy_bank_wallet_ata,
      candyTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      threadProgram: clockworkProvider.threadProgram.programId,
    })
    .instruction();

  const trigger = {
    cron: {
      schedule: cronExpression,
      skippable: false,
    },
  };

  // 💰 Top-up the thread with this amount of SOL to spend
  // Each tx ran by your thread will cost 1000 LAMPORTS
  const threadSOLBudget = 1 * LAMPORTS_PER_SOL;
  console.log("threadSOLBudget", threadSOLBudget);
  let ix = await clockworkProvider.threadCreate(
    threadAuthority,
    threadId,
    [targetIx],
    trigger,
    threadSOLBudget
  );
  const tx = new anchor.web3.Transaction().add(ix);
  const signature = await clockworkProvider.anchorProvider.sendAndConfirm(tx, [
    candy_payer,
  ]);
  console.log(
    "Your transaction signature",
    `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
  );
  await print_thread(clockworkProvider, threadAddress, cluster);
  return threadAddress;
};
let lastThreadExec = BN(0);
const waitForThreadExec = async (
  clockworkProvider: ClockworkProvider,
  thread: PublicKey,
  maxWait: number = 60
) => {
  let i = 1;
  while (true) {
    console.log("Waiting for thread to execute...");
    let account = await clockworkProvider.getThreadAccount(thread);
    console.log("execContext", account.execContext);
    const execContext = account.execContext;

    if (execContext) {
      if (
        lastThreadExec.toString() == "0" ||
        execContext.lastExecAt.gtn(lastThreadExec.toNumber())
      ) {
        lastThreadExec = execContext.lastExecAt;
        break;
      }
    }
    if (i == maxWait) throw Error("Timeout");
    i += 1;
    await new Promise((r) => setTimeout(r, i * 1000));
  }
};
