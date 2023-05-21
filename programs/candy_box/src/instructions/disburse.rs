use anchor_lang::{prelude::*};

use anchor_spl::{token::{Mint, Token, TokenAccount, TransferChecked,transfer_checked}, associated_token::AssociatedToken};
use clockwork_sdk::{state::{Thread, ThreadAccount, ThreadResponse}, ThreadProgram};

use crate::{error::CustomError, state::Subscription, SUB_ACC_SEED, events::Disbursed};

use crate::math::{
    BPS_DENOMINATOR,
    calculate_taker_fee,
    FeeConfig,
};

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
    pub candy_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::authority = subscription_account.candy_bank_wallet,
        associated_token::mint = mint,
    )]
    pub candy_bank_wallet_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut,seeds=[SUB_ACC_SEED,subscription_account.subscriber.key().as_ref(), &id],bump,constraint = subscription_account.active == true @ CustomError::SubscriptionInActive)]
    pub subscription_account: Account<'info, Subscription>,
    /// CHECK: this is fine
    // #[account(mut, constraint = *merchant_ata.owner == subscription_account.merchant @ CustomError::ATAMismatch)]
    #[account(
        mut,
        associated_token::authority = subscription_account.merchant,
        associated_token::mint = mint,
    )]
    pub merchant_ata: Box<Account<'info,TokenAccount>>,

    // /// CHECK: this is fine
    // pub user_pubkey: AccountInfo<'info>,

    pub signer: Signer<'info>,
    
    #[account(address = ThreadProgram::id())]
    pub thread_program: Program<'info, ThreadProgram>,
    
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = anchor_spl::associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<Disburse>, id: [u8;32] ) -> Result<ThreadResponse> {
    msg!("starting instruction");
    let subscription_account = &ctx.accounts.subscription_account;
    let price = subscription_account.price;
    let clock = Clock::get()?;
    // let user_pubkey = ctx.accounts.user_pubkey.key();

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
    assert!(ctx.accounts.subscription_vault.amount > price, "Not enough balance in user vault");
    // assert!(user_pubkey.clone() == subscription_account.subscriber, "user mistmatch");
    
    // Death valley starts here
    // TODO: test this out
    let fee_config = FeeConfig::new(subscription_account.candy_cut, BPS_DENOMINATOR);
    let candypay_cut = calculate_taker_fee(price, &fee_config).unwrap();
    let amt_to_merchant = price.checked_sub(candypay_cut).unwrap();

    let seeds: &[&[&[u8]]; 1] = &[&[SUB_ACC_SEED, subscription_account.subscriber.as_ref(),&subscription_account.id, &[subscription_account.bump]]];
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
            amt_to_merchant, // Price that was set when the subscription was initiated minus cut.
            ctx.accounts.mint.decimals,
        )?;// transfer to merchant
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.subscription_vault.to_account_info(),
                to: ctx.accounts.candy_bank_wallet_ata.to_account_info(),
                authority: subscription_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
            },
            seeds,
        );
        transfer_checked(
            transfer_ctx,
            candypay_cut, 
            ctx.accounts.mint.decimals,
        )?; // transfer to candypay
        // Death valley ends
        emit!(Disbursed{
            id: subscription_account.id,
            timestamp: clock.unix_timestamp,
            vault_balance: ctx.accounts.subscription_vault.amount,
            subscription_price: price
        });
    ctx.accounts.subscription_account.last_update_timestamp = clock.unix_timestamp as u64;

    Ok(ThreadResponse::default())
}
