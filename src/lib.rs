pub mod implicant;
pub mod solver;
pub mod optimizer;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

pub use solver::KmapSolver;
pub use implicant::Implicant;

#[cfg(target_arch = "wasm32")]
pub use wasm::*;

#[cfg(all(target_arch = "wasm32", feature = "wee_alloc"))]
use wee_alloc;

#[cfg(all(target_arch = "wasm32", feature = "wee_alloc"))]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
