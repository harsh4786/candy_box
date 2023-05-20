use crate::{
    events::SubscriptionCreated,
    state::{Subscription, SUB_ACC_SEED},
};
use anchor_lang::{prelude::*};
use anchor_spl::{token::{Mint, Token, TokenAccount, Approve, approve}, associated_token::AssociatedToken};


#[derive(Accounts)]
#[instruction(id: [u8;32])]
pub struct CreateSubscription<'info> {
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = signer,
        token::mint = mint,
        token::authority = subscription_account,
    )]
    pub subscription_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed, 
        associated_token::authority = candy_payer,
        associated_token::mint = mint,
        payer = candy_payer
    )]
    pub candy_token_account: Account<'info, TokenAccount>,

    #[account(
        init, 
        payer = signer,
        seeds=[SUB_ACC_SEED,signer.key().as_ref(),&id],
        bump, 
        space = Subscription::LEN,
    )]
    pub subscription_account: Account<'info, Subscription>,
    /// CHECK: this is okay
    pub merchant: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,
    
    /// CHECK: this is okay
    pub candy_bank_wallet: AccountInfo<'info>,

    #[account(mut)]
    pub candy_payer: Signer<'info>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = anchor_spl::associated_token::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct CreateSubscriptionArgs{
    pub id: [u8; 32],
    pub initialization_time: u64,
    pub interval: u64,
    pub price: u64,
    pub candy_cut: u64,
}
pub fn handler(
    ctx: Context<CreateSubscription>,
    args: CreateSubscriptionArgs
) -> Result<()> {
    let CreateSubscriptionArgs{
        id,
        initialization_time,
        interval,
        price,
        candy_cut
    } = args;
    let subscription_acc = &mut ctx.accounts.subscription_account;
    let candy_token_account = &mut ctx.accounts.candy_token_account;
    assert!(candy_cut > 1,"candy cut too low");
    subscription_acc.subscriber = ctx.accounts.signer.key();
    subscription_acc.termination_time = None;
    subscription_acc.initialization_time = initialization_time;
    subscription_acc.interval = interval;
    subscription_acc.price = price;
    subscription_acc.active = true;
    subscription_acc.bump = *ctx.bumps.get("subscription_account").unwrap();
    subscription_acc.mint = ctx.accounts.mint.key();
    subscription_acc.merchant = ctx.accounts.merchant.key();
    subscription_acc.associated_vault = ctx.accounts.subscription_vault.key();
    subscription_acc.last_update_timestamp = Clock::get()?.unix_timestamp as u64;
    subscription_acc.id = id;
    subscription_acc.candy_payer = ctx.accounts.candy_payer.key();
    subscription_acc.candy_cut = candy_cut;
    subscription_acc.candy_bank_wallet = ctx.accounts.candy_bank_wallet.key();
    let approve_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(), 
        Approve {
            authority: ctx.accounts.candy_payer.to_account_info(),
            to: candy_token_account.to_account_info(),
            delegate: subscription_acc.to_account_info(),
        });
        
    approve(approve_cpi,u64::MAX)?;

    emit!(SubscriptionCreated {
        id: subscription_acc.id,
        subscriber: subscription_acc.subscriber,
        associated_vault: subscription_acc.associated_vault,
        merchant: subscription_acc.merchant,
        initialization_time: subscription_acc.initialization_time,
        termination_time: subscription_acc.termination_time,
        last_update_timestamp: subscription_acc.last_update_timestamp,
        active: subscription_acc.active,
        price: subscription_acc.price,
        interval: subscription_acc.interval,
    });
    Ok(())
}
