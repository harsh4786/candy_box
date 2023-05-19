use anchor_lang::prelude::*;




// #[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
// pub enum TimeInterval{
//     Weekly,
//     Monthly,
//     Yearly,
// }



// #[account]
// #[derive(Debug)]
// pub struct SubscriptionPlan{
//     pub price: u64,
//     pub interval: u64,
//     pub accepting_new_subs: bool,
//     pub active: bool,
//     pub name: String,
// }



#[account]
#[derive(Debug)]
pub struct Subscription{
   pub id: [u8; 32],
   pub subscriber: Pubkey,
   pub associated_vault: Pubkey,
   pub merchant_vault: Pubkey,
   pub initialization_time: i64,
   pub termination_time: i64,
   pub last_update_timestamp: Option<i64>,
   pub credit_counter: u64,
   pub accept_new_payments: bool,
   pub bump: u8,
}