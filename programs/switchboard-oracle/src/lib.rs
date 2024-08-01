use anchor_lang::prelude::*;
use switchboard_on_demand::PullFeedAccountData;

declare_id!("8zFhh2V3NGTezMo4ZEA6mU66UnAbuKgrQNykTxzghoYC");

#[program]
pub mod switchboard_oracle {
    use super::*;

    pub fn pull_sol_euro_price(ctx: Context<SolEuroSwitchboard>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let soul_euro_feed_account = ctx.accounts.sol_euro_feed.data.borrow();
        let sol_euro_feed = PullFeedAccountData::parse(soul_euro_feed_account).unwrap();
        msg!("Sol/Euro: {:?}", sol_euro_feed.value());
        Ok(())
    }

    pub fn pull_sol_usdc_price(ctx: Context<SolUsdcSwitchboard>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        let soul_usdc_feed_account = ctx.accounts.sol_usdc_feed.data.borrow();
        let sol_usdc_feed = PullFeedAccountData::parse(soul_usdc_feed_account).unwrap();
        msg!("Sol/USDC: {:?}", sol_usdc_feed.value());
        Ok(())
    }
}
#[derive(Accounts)]
pub struct SolEuroSwitchboard<'info> {
    /// CHECK: from script
    pub sol_euro_feed: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SolUsdcSwitchboard<'info> {
    /// CHECK: from script
    pub sol_usdc_feed: AccountInfo<'info>,
}
