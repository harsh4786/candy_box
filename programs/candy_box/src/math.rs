use anchor_lang::prelude::*;
use num_traits::{One, Zero};
use std::convert::TryInto;
use std::panic::Location;
// pub const PERCENTAGE_PRECISION: u128 = 1_000_000; // expo -6 (represents 100%)
pub const BPS_DENOMINATOR: u32 = 10000;
pub const FEE_PERCENTAGE_DENOMINATOR: u32 = 100;

use crate::error::CustomError;

#[derive(AnchorDeserialize, AnchorSerialize, Copy, Debug, Clone)]
pub struct FeeConfig {
    fee_numerator: u32,
    fee_denominator: u32,
}
impl FeeConfig {
    pub fn new(bps_numerator: u32, denominator: u32) -> Self {
        Self {
            fee_numerator: bps_numerator,
            fee_denominator: denominator,
        }
    }
}
impl Default for FeeConfig {
    fn default() -> Self {
        FeeConfig {
            fee_numerator: 1,
            fee_denominator: BPS_DENOMINATOR,
        }
    }
}
// Copied from Drift Protocol-v2
// https://github.com/drift-labs/protocol-v2/blob/master/programs/drift/src/math
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

pub fn calculate_taker_fee(amount: u64, fee_config: &FeeConfig) -> Result<u64> {
    amount
        .cast::<u128>()?
        .checked_mul(fee_config.fee_numerator.cast::<u128>()?)
        .unwrap()
        .checked_ceil_div(fee_config.fee_denominator.cast::<u128>()?)
        .unwrap()
        .cast()
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

pub trait CheckedCeilDiv: Sized {
    /// Perform ceiling division
    fn checked_ceil_div(&self, rhs: Self) -> Option<Self>;
}

macro_rules! checked_impl {
    ($t:ty) => {
        impl CheckedCeilDiv for $t {
            #[track_caller]
            #[inline]
            fn checked_ceil_div(&self, rhs: $t) -> Option<$t> {
                let quotient = self.checked_div(rhs)?;

                let remainder = self.checked_rem(rhs)?;

                if remainder > <$t>::zero() {
                    quotient.checked_add(<$t>::one())
                } else {
                    Some(quotient)
                }
            }
        }
    };
}
checked_impl!(u128);
checked_impl!(u64);
checked_impl!(u32);
checked_impl!(u16);
checked_impl!(u8);
checked_impl!(i128);
checked_impl!(i64);
checked_impl!(i32);
checked_impl!(i16);
checked_impl!(i8);
