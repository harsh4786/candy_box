import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CandyBox } from "../target/types/candy_box";

describe("candy_box", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.CandyBox as Program<CandyBox>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
