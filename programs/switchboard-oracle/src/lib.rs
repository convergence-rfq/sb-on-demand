use anchor_lang::prelude::*;

declare_id!("8zFhh2V3NGTezMo4ZEA6mU66UnAbuKgrQNykTxzghoYC");

#[program]
pub mod switchboard_oracle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
