use crate::implicant::Implicant;
use std::collections::{HashSet, HashMap};

pub struct Optimizer;

impl Optimizer {
    pub fn petricks_method(
        prime_implicants: &[Implicant],
        minterms: &[u32],
    ) -> Vec<usize> {
        if prime_implicants.is_empty() || minterms.is_empty() {
            return Vec::new();
        }

        let coverage = Self::build_coverage_matrix(prime_implicants, minterms);

        let mut solution = Vec::new();
        let mut covered = HashSet::new();

        for (_minterm, covering_pis) in &coverage {
            if covering_pis.len() == 1 {
                let pi_idx = covering_pis[0];
                if !solution.contains(&pi_idx) {
                    solution.push(pi_idx);
                    for &m in &prime_implicants[pi_idx].minterms {
                        covered.insert(m);
                    }
                }
            }
        }

        if covered.len() == minterms.len() {
            return solution;
        }

        let uncovered: Vec<u32> = minterms.iter()
            .filter(|m| !covered.contains(m))
            .copied()
            .collect();

        if uncovered.is_empty() {
            return solution;
        }

        let remaining_solution = Self::branch_and_bound(
            prime_implicants,
            &uncovered,
            &solution,
        );

        solution.extend(remaining_solution);
        solution
    }

    fn build_coverage_matrix(
        prime_implicants: &[Implicant],
        minterms: &[u32],
    ) -> HashMap<u32, Vec<usize>> {
        let mut coverage = HashMap::new();

        for &minterm in minterms {
            let covering: Vec<usize> = prime_implicants
                .iter()
                .enumerate()
                .filter(|(_, pi)| pi.covers(minterm))
                .map(|(idx, _)| idx)
                .collect();
            coverage.insert(minterm, covering);
        }

        coverage
    }

    fn branch_and_bound(
        prime_implicants: &[Implicant],
        uncovered: &[u32],
        existing_solution: &[usize],
    ) -> Vec<usize> {
        let mut best_solution = Vec::new();
        let mut best_cost = (usize::MAX, u32::MAX);

        let candidates: Vec<usize> = (0..prime_implicants.len())
            .filter(|idx| !existing_solution.contains(idx))
            .collect();

        Self::backtrack(
            prime_implicants,
            uncovered,
            &candidates,
            &mut Vec::new(),
            &mut HashSet::new(),
            &mut best_solution,
            &mut best_cost,
        );

        best_solution
    }

    fn backtrack(
        prime_implicants: &[Implicant],
        uncovered: &[u32],
        candidates: &[usize],
        current: &mut Vec<usize>,
        covered: &mut HashSet<u32>,
        best_solution: &mut Vec<usize>,
        best_cost: &mut (usize, u32),
    ) {
        if current.len() >= best_cost.0 {
            return;
        }

        let current_literals: u32 = current.iter()
            .map(|&idx| prime_implicants[idx].literal_count() as u32)
            .sum();

        if current.len() == best_cost.0 && current_literals >= best_cost.1 {
            return;
        }

        if uncovered.iter().all(|m| covered.contains(m)) {
            let total_literals: u32 = current.iter()
                .map(|&idx| prime_implicants[idx].literal_count() as u32)
                .sum();

            let cost = (current.len(), total_literals);

            if cost.0 < best_cost.0 || (cost.0 == best_cost.0 && cost.1 < best_cost.1) {
                *best_cost = cost;
                *best_solution = current.clone();
            }
            return;
        }

        let mut min_coverage = usize::MAX;
        let mut constrained_minterm = None;

        for &m in uncovered {
            if !covered.contains(&m) {
                let coverage_count = candidates.iter()
                    .filter(|&&idx| prime_implicants[idx].covers(m))
                    .count();
                if coverage_count < min_coverage {
                    min_coverage = coverage_count;
                    constrained_minterm = Some(m);
                }
            }
        }

        if let Some(minterm) = constrained_minterm {
            for &pi_idx in candidates {
                if prime_implicants[pi_idx].covers(minterm) {
                    current.push(pi_idx);

                    let newly_covered: Vec<u32> = prime_implicants[pi_idx].minterms.iter()
                        .filter(|&&m| !covered.contains(&m))
                        .copied()
                        .collect();

                    for m in &newly_covered {
                        covered.insert(*m);
                    }

                    Self::backtrack(
                        prime_implicants,
                        uncovered,
                        candidates,
                        current,
                        covered,
                        best_solution,
                        best_cost,
                    );

                    current.pop();
                    for m in newly_covered {
                        covered.remove(&m);
                    }
                }
            }
        }
    }

    pub fn is_tautology(minterms: &[u32], num_vars: u32) -> bool {
        minterms.len() == (1 << num_vars)
    }

    pub fn is_single_term(minterms: &[u32]) -> bool {
        minterms.len() == 1
    }
}
