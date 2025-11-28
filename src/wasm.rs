use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::solver::KmapSolver;

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[derive(Serialize, Deserialize)]
pub struct SolveResult {
    pub expression: String,
    pub prime_implicants: Vec<PrimeImplicantInfo>,
}

#[derive(Serialize, Deserialize)]
pub struct PrimeImplicantInfo {
    pub binary: String,
    pub minterms: Vec<u32>,
}

#[wasm_bindgen]
pub fn solve_kmap(num_vars: u32, minterms: Vec<u32>, dont_cares: Vec<u32>) -> JsValue {
    // Input validation
    if num_vars > 6 {
        let error = SolveResult {
            expression: "Error: Maximum 6 variables supported".to_string(),
            prime_implicants: Vec::new(),
        };
        return serde_wasm_bindgen::to_value(&error).unwrap();
    }

    let max_value = (1 << num_vars) - 1;
    for &m in minterms.iter().chain(dont_cares.iter()) {
        if m > max_value {
            let error = SolveResult {
                expression: format!("Error: Invalid minterm {} (max: {})", m, max_value),
                prime_implicants: Vec::new(),
            };
            return serde_wasm_bindgen::to_value(&error).unwrap();
        }
    }

    // Create solver
    let mut solver = KmapSolver::new(num_vars);
    
    for minterm in minterms {
        solver.add_minterm(minterm);
    }
    
    for dont_care in dont_cares {
        solver.add_dont_care(dont_care);
    }

    // Solve
    let expression = solver.solve();
    
    // Get prime implicants for visualization
    let prime_implicants = solver.get_prime_implicants()
        .iter()
        .map(|pi| {
            let binary = format_binary(pi.value, pi.mask, num_vars);
            PrimeImplicantInfo {
                binary,
                minterms: pi.minterms.clone(),
            }
        })
        .collect();
    
    let result = SolveResult {
        expression,
        prime_implicants,
    };
    
    serde_wasm_bindgen::to_value(&result).unwrap()
}

fn format_binary(value: u32, mask: u32, num_vars: u32) -> String {
    let mut result = String::new();
    for i in (0..num_vars).rev() {
        let bit = 1 << i;
        if mask & bit != 0 {
            if value & bit != 0 {
                result.push('1');
            } else {
                result.push('0');
            }
        } else {
            result.push('-');
        }
    }
    result
}

#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}