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
#[derive(Debug, Default)]
pub struct Subscription {
    pub id: [u8; 32],
    pub subscriber: Pubkey,
    pub associated_vault: Pubkey,
    pub merchant: Pubkey,
    pub mint: Pubkey,
    pub initialization_time: u64,
    pub termination_time: Option<u64>,
    pub last_update_timestamp: u64,
    pub candy_payer: Pubkey,
    //  pub credit_counter: u64,
    pub active: bool,
    pub bump: u8,
    pub price: u64,
    pub interval: u64,
}

pub const SUB_ACC_SEED: &[u8] = b"subscription".as_slice();
impl Subscription {
    pub const LEN: usize = std::mem::size_of::<Self>();
}
