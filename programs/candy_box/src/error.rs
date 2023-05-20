use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("ATA not owned by user or merchant")]
    AssociatedTokenAccountNotAuthorised,
    #[msg("ATA mint invalid")]
    AssociatedTokenAccountInvalidMint,
    #[msg("Owner of this vault is not the pda entered")]
    VaultOwnerMisMatch,
    #[msg("Mint given is not matching mint of account")]
    InvalidMint,
    #[msg("Owner of ATA is not owner set in account")]
    ATAMismatch,
    #[msg("Subscription is not active")]
    SubscriptionInActive,
    #[msg("Invalid or unrelated subsriber")]
    InvalidOrUnrelatedSubscriber,
    #[msg("Insufficient funds to withdraw")]
    InsufficientWithdrawableAmount,
    #[msg("Math Error: Casting Failure")]
    FailedToCast,
    #[msg("Math Error: arithmetic overflow!")]
    MathOverflow,
}

#[macro_export]
macro_rules! print_error {
    ($err:expr) => {{
        || {
            let error_code: ErrorCode = $err;
            msg!("{:?} thrown at {}:{}", error_code, file!(), line!());
            $err
        }
    }};
}
