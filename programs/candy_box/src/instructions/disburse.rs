use anchor_lang::{prelude::*};

use anchor_spl::{token::{Mint, Token, TokenAccount, TransferChecked,transfer_checked}, associated_token::AssociatedToken};
use clockwork_sdk::state::{Thread, ThreadAccount, ThreadResponse};

use crate::{error::CustomError, state::Subscription, SUB_ACC_SEED, events::Disbursed};

#[derive(Accounts)]
#[instruction(id: [u8;32])]
pub struct Disburse<'info> {
    #[account(constraint = mint.key() == subscription_account.mint @ CustomError::InvalidMint)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub subscription_vault: Box<Account<'info, TokenAccount>>,

    #[account(
       signer, 
        address = thread.pubkey(),
        constraint = thread.authority.eq(&subscription_account.candy_payer),
    )]
    pub thread: Box<Account<'info, Thread>>,

    #[account(
        mut,
        associated_token::authority = subscription_account.candy_payer,
        associated_token::mint = mint,
    )]
    pub candy_token_account: Account<'info, TokenAccount>,

    #[account(mut,seeds=[SUB_ACC_SEED,user_pubkey.key().as_ref(), &id],bump,constraint = subscription_account.active == true @ CustomError::SubscriptionInActive)]
    pub subscription_account: Account<'info, Subscription>,
    /// CHECK: this is fine
    #[account(mut, constraint = *merchant_ata.owner == subscription_account.merchant @ CustomError::ATAMismatch)]
    pub merchant_ata: AccountInfo<'info>,

    /// CHECK: this is fine
    pub user_pubkey: AccountInfo<'info>,

    pub signer: Signer<'info>,
    
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = anchor_spl::associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<Disburse>) -> Result<ThreadResponse> {
    msg!("starting instruction");
    let subscription_account = &mut ctx.accounts.subscription_account;
    let clock = Clock::get()?;
    let user_pubkey = ctx.accounts.user_pubkey.key();

    assert!(ctx.accounts.subscription_vault.amount > 0, "vault balance zero");
    assert!(user_pubkey.clone() == subscription_account.subscriber, "user mistmatch");

    if subscription_account.last_update_timestamp == 0 {
        assert!(
            clock.unix_timestamp as u64 - subscription_account.initialization_time >= subscription_account.interval,
            "payment not yet due"
        );
    }else{
        assert!(
            clock.unix_timestamp as u64 - subscription_account.last_update_timestamp >= subscription_account.interval,
            "payment not yet due"
        );
    }

    let seeds: &[&[&[u8]]; 1] = &[&[SUB_ACC_SEED, user_pubkey.as_ref(),&subscription_account.id, &[subscription_account.bump]]];
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.subscription_vault.to_account_info(),
                to: ctx.accounts.merchant_ata.to_account_info(),
                authority: subscription_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
            },
            seeds,
        );
        transfer_checked(
            transfer_ctx,
            ctx.accounts.subscription_vault.amount,
            ctx.accounts.mint.decimals,
        )?;
        emit!(Disbursed{
            id: subscription_account.id,
            timestamp: clock.unix_timestamp
        });
    subscription_account.last_update_timestamp = clock.unix_timestamp as u64;

    Ok(ThreadResponse::default())
}