use anchor_lang::prelude::*;

#[event]
pub struct SubscriptionCreated {
    pub id: [u8; 32],
    pub subscriber: Pubkey,
    pub associated_vault: Pubkey,
    pub merchant: Pubkey,
    pub initialization_time: u64,
    pub termination_time: Option<u64>,
    pub last_update_timestamp: u64,
    pub active: bool,
    pub price: u64,
    pub interval: u64,
}

#[event]
pub struct SubscriptionCancelled {
    pub id: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct Disbursed {
    pub id: [u8; 32],
    pub timestamp: i64,
}
