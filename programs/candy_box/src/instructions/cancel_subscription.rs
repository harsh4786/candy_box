use crate::{error::CustomError, events::SubscriptionCancelled, state::Subscription, SUB_ACC_SEED};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked},
};
// use clockwork_sdk::{
//     self,
//     state::{Thread, Trigger},
//     ThreadProgram,
// };

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(constraint = mint.key() == subscription_account.mint @ CustomError::InvalidMint)]
    pub mint: Account<'info, Mint>,
    #[account(mut,close = user_pubkey, constraint = subscription_vault.owner == subscription_account.key() @ CustomError::VaultOwnerMisMatch)]
    pub subscription_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut,close = user_pubkey,seeds=[SUB_ACC_SEED,user_pubkey.key().as_ref(),&subscription_account.id],bump)]
    pub subscription_account: Account<'info, Subscription>,
    /// CHECK: this is fine
    #[account(mut)]
    pub merchant_ata: AccountInfo<'info>,
    /// CHECK: this is fine
    #[account(mut)]
    pub user_pubkey: AccountInfo<'info>,

    #[account(mut, constraint = user_ata.owner == subscription_account.subscriber @ CustomError::AssociatedTokenAccountNotAuthorised,
    constraint = user_ata.mint == subscription_account.mint @ CustomError::AssociatedTokenAccountInvalidMint)]
    pub user_ata: Account<'info, TokenAccount>,

    #[account(mut,
        constraint = (signer_ata.owner == subscription_account.subscriber || signer_ata.owner == subscription_account.merchant) @ CustomError::AssociatedTokenAccountNotAuthorised,
        constraint = signer_ata.mint == subscription_account.mint @ CustomError::AssociatedTokenAccountInvalidMint,
        has_one = owner
    )]
    pub signer_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>, // either merchant or user

    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = anchor_spl::associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<CancelSubscription>) -> Result<()> {
    let subscription_acc = &mut ctx.accounts.subscription_account;
    let clock = Clock::get()?;
    let signer = ctx.accounts.owner.key();
    let user_pubkey = ctx.accounts.user_pubkey.key();

    assert!(
        user_pubkey == subscription_acc.subscriber,
        "user_pubkey passed is not same as user in subscription_account"
    );
    assert!(
        signer == user_pubkey || signer == subscription_acc.merchant,
        "signer is not user or merchant"
    );
    if let Some(termination_time) = subscription_acc.termination_time {
        assert!(
            clock.unix_timestamp as u64 >= termination_time,
            "terminating too early"
        );
    }

    let seeds: &[&[&[u8]]; 1] = &[&[
        SUB_ACC_SEED,
        user_pubkey.as_ref(),
        &subscription_acc.id,
        &[subscription_acc.bump],
    ]];
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.subscription_vault.to_account_info(),
            to: ctx.accounts.user_ata.to_account_info(),
            authority: subscription_acc.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
        },
        seeds,
    );
    transfer_checked(
        transfer_ctx,
        ctx.accounts.subscription_vault.amount,
        ctx.accounts.mint.decimals,
    )?;

    subscription_acc.active = false;
    emit!(SubscriptionCancelled {
        id: subscription_acc.id,
        timestamp: clock.unix_timestamp
    });
    Ok(())
}
