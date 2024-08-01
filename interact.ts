import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SwitchboardOracle } from "./target/types/switchboard_oracle.js";
import {
  AnchorUtils,
  PullFeed,
  CrossbarClient,
  OracleJob,
  getDefaultQueue,
  getDefaultDevnetQueue,
  asV0Tx,
  PullFeedValueEvent,
  sleep,
} from "@switchboard-xyz/on-demand";
import { Commitment } from "@solana/web3.js";
import "dotenv/config";

(async () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  console.log("Using provider", anchor.getProvider().connection.rpcEndpoint);

  const solEuroFeedPubkey = new anchor.web3.PublicKey(
    "4nNT2Pw2NkYKrYTdSr2RtecBUG1UD9HSrcoM8bE1Gfoh"
  );
  const solUsdcFeedPubkey = new anchor.web3.PublicKey(
    "CqDSc4329QrFK1i6iMNQXSSeifTaXucQydR8mm8p1fcp"
  );
  const { keypair, connection, program } = await AnchorUtils.loadEnv();
  console.log("Using payer: ", keypair.publicKey.toBase58());
  const solEuroFeedAccount = new PullFeed(program, solEuroFeedPubkey);
  const solUsdcFeedAccount = new PullFeed(program, solUsdcFeedPubkey);
  const TX_CONFIG = {
    commitment: "processed" as Commitment,
    skipPreflight: true,
    maxRetries: 0,
  };
  const payer = await AnchorUtils.initKeypairFromFile(
    `${process.env.HOME}/.config/solana/id.json`
  );
  const program_keypair_path = "target/deploy/switchboard_oracle-keypair.json";
  const myAnchorProgram = await getProgram(
    program.provider,
    program_keypair_path
  );
  const ix_1 = await myAnchorProgram.methods
    .pullSolEuroPrice()
    .accounts({
      solEuroFeed: solEuroFeedPubkey,
    })
    .instruction();
  const ix_2 = await myAnchorProgram.methods
    .pullSolUsdcPrice()
    .accounts({
      solUsdcFeed: solUsdcFeedPubkey,
    })
    .instruction();
  while (true) {
    const [
      solEuroFeedPullIx,
      solEuroFeedResponses,
      _solEuroFeedOk,
      solEuroFeedLuts,
    ] = await solEuroFeedAccount.fetchUpdateIx();
    const [
      solUsdcFeedPullIx,
      solUsdcFeedResponses,
      _solUsdcFeedOk,
      solUsdcFeedLuts,
    ] = await solUsdcFeedAccount.fetchUpdateIx();
    const tx = await asV0Tx({
      connection,
      ixs: [solEuroFeedPullIx, ix_1, solUsdcFeedPullIx, ix_2],
      signers: [keypair],
      computeUnitPrice: 200_000,
      computeUnitLimitMultiple: 1.3,
      lookupTables: [...solEuroFeedLuts, ...solUsdcFeedLuts],
    });
    const sim = await connection.simulateTransaction(tx, TX_CONFIG);
    const updateEvent = new PullFeedValueEvent(
      AnchorUtils.loggedEvents(program, sim.value.logs)[0]
    ).toRows();
    console.log("Submitted Price Updates:\n", updateEvent);
    console.log(
      `Transaction sent: ${await connection.sendTransaction(tx, {
        preflightCommitment: "processed" as Commitment,
        skipPreflight: true,
      })}`
    );
    sleep(3000);
  }
})();

async function getProgram(
  provider: anchor.Provider,
  keypath: string
): Promise<anchor.Program<SwitchboardOracle>> {
  try {
    const myProgramKeypair = await AnchorUtils.initKeypairFromFile(keypath);
    const pid = myProgramKeypair.publicKey;
    const idl = (await anchor.Program.fetchIdl(pid, provider))!;
    const program = new anchor.Program(
      idl,
      provider
    ) as Program<SwitchboardOracle>;
    return program;
  } catch (e) {
    throw new Error("Failed to load demo program. Was it deployed?");
  }
}
