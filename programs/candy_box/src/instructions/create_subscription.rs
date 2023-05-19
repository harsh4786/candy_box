use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use crate::state::{Subscription};
use clockwork_sdk::{
    self,
    ThreadProgram,
    state::{
        Trigger,
        Thread,
    }
    
};



#[derive(Accounts)]
pub struct CreateSubscription<'info>{


    #[account(
        init,
        payer = subscriber,
        space = std::mem::size_of::<Subscription>(),
        seeds = [
            "SUBSCRIPTION".as_bytes(),
            subscriber.key().as_ref(),
        ],
        bump
    )]
    pub subscription: Account<'info, Subscription>,
    #[account(mut)]
    pub subscriber: Signer<'info>,

    #[account(address = clockwork_sdk::ID)]
    pub thread_program: Program<'info, ThreadProgram>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>
}


pub fn handler(
    ctx: Context<CreateSubscription>,


) -> Result<()> {


    Ok(())
}