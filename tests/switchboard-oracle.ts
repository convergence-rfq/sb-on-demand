import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwitchboardOracle } from "../target/types/switchboard_oracle.js";
import {
  AnchorUtils,
  PullFeed,
  CrossbarClient,
  OracleJob,
  getDefaultQueue,
  getDefaultDevnetQueue,
  asV0Tx,
  PullFeedValueEvent,
} from "@switchboard-xyz/on-demand";
import { Commitment } from "@solana/web3.js";
import "dotenv/config";

describe("switchboard-oracle", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  console.log("Using provider", anchor.getProvider().connection.rpcEndpoint);

  const myProgram = anchor.workspace
    .SwitchboardOracle as Program<SwitchboardOracle>;

  const feed_pubkey = new anchor.web3.PublicKey(
    "6bsjqFVARhNJewHY5YAVGZGaHAujaf3DMEUtgNkZNvbw"
  );
  const { keypair, connection, program } = await AnchorUtils.loadEnv();
  const feedAccount = new PullFeed(program, feed_pubkey);
  const TX_CONFIG = {
    commitment: "processed" as Commitment,
    skipPreflight: true,
    maxRetries: 0,
  };

  const payer = await AnchorUtils.initKeypairFromFile(
    `${process.env.HOME}/.config/solana/id.json`
  );

  it("Is initialized!", async () => {
    console.log("Initialized!");
    const ix = await myProgram.methods
      .initialize()
      .accounts({ solEuroFeed: feed_pubkey.toBase58() })
      .instruction();
    const [pullIx, responses, _ok, luts] = await feedAccount.fetchUpdateIx();
    const tx = await asV0Tx({
      connection,
      ixs: [pullIx, ix],
      signers: [keypair],
      computeUnitPrice: 200_000,
      computeUnitLimitMultiple: 1.3,
      lookupTables: luts,
    });
    const sim = await connection.simulateTransaction(tx, TX_CONFIG);
    const updateEvent = new PullFeedValueEvent(
      AnchorUtils.loggedEvents(program, sim.value.logs)[0]
    ).toRows();
    console.log("Submitted Price Updates:\n", updateEvent);
    console.log(`Transaction sent: ${await connection.sendTransaction(tx)}`);
  });
});
