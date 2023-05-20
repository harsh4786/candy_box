use anchor_lang::prelude::*;

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
    /// in bps 1% = 100bps
    pub candy_cut: u64,
    pub candy_bank_wallet: Pubkey,
    pub active: bool,
    pub bump: u8,
    pub price: u64,
    pub interval: u64,
}

pub const SUB_ACC_SEED: &[u8] = b"subscription".as_slice();
impl Subscription {
    pub const LEN: usize = 8 + std::mem::size_of::<Self>();
}
