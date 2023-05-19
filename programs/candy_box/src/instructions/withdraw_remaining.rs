use crate::error::CustomError;
use crate::state::{Subscription, SUB_ACC_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct WithdrawRemaining<'info> {
    #[account(
        has_one = associated_vault,
        has_one = mint,
        seeds = [
            SUB_ACC_SEED,
            user_pubkey.key().as_ref(),
            &subscription_account.id
        ],
        bump = subscription_account.bump,
        constraint = subscription_account.subscriber == user_pubkey.key() @ CustomError::InvalidOrUnrelatedSubscriber
    )]
    pub subscription_account: Account<'info, Subscription>,
    #[account(
        mut,
        associated_token::mint = mint.key(),
        associated_token::authority = subscription_account,
        constraint = associated_vault.amount >= amount @ CustomError::InsufficientWithdrawableAmount
    )]
    pub associated_vault: Account<'info, TokenAccount>,
    #[account(
        mut, 
        associated_token::mint = mint.key(),
        associated_token::authority = user_pubkey,
    )]
    pub user_ata: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub user_pubkey: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawRemaining>, amount: u64) -> Result<()> {
    let user_pubkey = ctx.accounts.user_pubkey.key();
    let subscription_account = &ctx.accounts.subscription_account;
    let seeds: &[&[&[u8]]; 1] = &[&[
        SUB_ACC_SEED,
        user_pubkey.as_ref(),
        &subscription_account.id,
        &[subscription_account.bump],
    ]];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.associated_vault.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: subscription_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
        },
        seeds,
    );
    transfer_checked(transfer_ctx, amount, ctx.accounts.mint.decimals)?;
    Ok(())
}
