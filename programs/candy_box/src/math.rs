use anchor_lang::prelude::*;

use std::convert::TryInto;
use std::panic::Location;
pub const PERCENTAGE_PRECISION: u128 = 1_000_000; // expo -6 (represents 100%)
pub const ONE_BPS_DENOMINATOR: u32 = 10000;
pub const FEE_PERCENTAGE_DENOMINATOR: u32 = 100;
use crate::error::CustomError;
#[derive(AnchorDeserialize, AnchorSerialize, Copy, Debug, Clone)]
pub struct FeeConfig {
    fee_numerator: u32,
    fee_denominator: u32,
}

pub trait Cast: Sized {
    #[track_caller]
    #[inline(always)]
    fn cast<T: std::convert::TryFrom<Self>>(self) -> Result<T> {
        match self.try_into() {
            Ok(result) => Ok(result),
            Err(_) => {
                let caller = Location::caller();
                msg!(
                    "Casting error thrown at {}:{}",
                    caller.file(),
                    caller.line()
                );
                Err(CustomError::FailedToCast.into())
            }
        }
    }
}

impl Cast for u128 {}
impl Cast for u64 {}
impl Cast for u32 {}
impl Cast for u16 {}
impl Cast for u8 {}
impl Cast for i128 {}
impl Cast for i64 {}
impl Cast for i32 {}
impl Cast for i16 {}
