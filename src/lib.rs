pub mod implicant;
pub mod solver;
pub mod optimizer;

#[cfg(target_arch = "wasm32")]
pub mod wasm;

pub use solver::KmapSolver;
pub use implicant::Implicant;

#[cfg(target_arch = "wasm32")]
pub use wasm::*;

