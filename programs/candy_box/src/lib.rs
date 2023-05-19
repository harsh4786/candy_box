use anchor_lang::prelude::*;
mod error;
mod events;
mod instructions;
mod state;
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub const SUB_ACC_SEED: &[u8] = b"subscription";
use instructions::*;
#[program]
pub mod candy_box {

    use super::*;

    pub fn create_subscription(
        ctx: Context<CreateSubscription>,
        args: create_subscription::CreateSubscriptionArgs,
    ) -> Result<()> {
        create_subscription::handler(ctx, args)
    }
    pub fn withdraw_remaining(ctx: Context<WithdrawRemaining>, amount: u64) -> Result<()> {
        withdraw_remaining::handler(ctx, amount)
    }
    pub fn disburse(ctx: Context<Disburse>) -> Result<()> {
        disburse::handler(ctx);
        Ok(())
    }
    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        cancel_subscription::handler(ctx)
    }
}
