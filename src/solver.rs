use crate::implicant::Implicant;
use crate::optimizer::Optimizer;
use std::collections::{HashMap, HashSet};

pub struct KmapSolver {
    num_vars: u32,
    minterms: Vec<u32>,
    dont_cares: Vec<u32>,
    prime_implicants_cache: Option<Vec<Implicant>>,
}

impl KmapSolver {
    pub fn new(num_vars: u32) -> Self {
        assert!(num_vars <= 8, "Maximum 8 variables supported");
        Self {
            num_vars,
            minterms: Vec::new(),
            dont_cares: Vec::new(),
            prime_implicants_cache: None,
        }
    }

    pub fn from_truth_table(truth_table: &[bool]) -> Self {
        let len = truth_table.len();
        assert!(len.is_power_of_two(), "Truth table length must be a power of 2");
        assert!(len <= 256, "Maximum 8 variables (256 entries) supported");

        let num_vars = (len as f64).log2() as u32;
        let mut solver = Self::new(num_vars);

        for (i, &val) in truth_table.iter().enumerate() {
            if val {
                solver.minterms.push(i as u32);
            }
        }

        solver
    }

    pub fn add_minterm(&mut self, minterm: u32) {
        assert!(minterm < (1 << self.num_vars), "Minterm out of range");
        if !self.minterms.contains(&minterm) {
            self.minterms.push(minterm);
            self.prime_implicants_cache = None;
        }
    }

    pub fn add_dont_care(&mut self, dont_care: u32) {
        assert!(dont_care < (1 << self.num_vars), "Don't care out of range");
        if !self.dont_cares.contains(&dont_care) {
            self.dont_cares.push(dont_care);
            self.prime_implicants_cache = None;
        }
    }

    fn find_prime_implicants(&mut self) -> Vec<Implicant> {
        if let Some(ref cached) = self.prime_implicants_cache {
            return cached.clone();
        }

        let mut all_terms: Vec<u32> = self.minterms.clone();
        all_terms.extend(&self.dont_cares);

        if all_terms.is_empty() {
            return Vec::new();
        }

        all_terms.sort_unstable();

        let mut current: Vec<Implicant> = all_terms
            .iter()
            .map(|&m| Implicant::new(m, self.num_vars))
            .collect();

        let mut prime_implicants = Vec::new();

        while !current.is_empty() {
            let mut next = Vec::new();
            let mut used = vec![false; current.len()];

            let mut groups: Vec<Vec<usize>> = vec![Vec::new(); (self.num_vars + 1) as usize];
            for (idx, imp) in current.iter().enumerate() {
                let ones = (imp.value & imp.mask).count_ones() as usize;
                groups[ones].push(idx);
            }

            let mut seen = HashSet::with_capacity(current.len());

            for ones in 0..self.num_vars as usize {
                if groups[ones].is_empty() || groups[ones + 1].is_empty() {
                    continue;
                }

                for &i in &groups[ones] {
                    for &j in &groups[ones + 1] {
                        if current[i].can_combine(&current[j]) {
                            let combined = current[i].combine(&current[j]);
                            let key = (combined.mask, combined.value);

                            if seen.insert(key) {
                                next.push(combined);
                            }

                            used[i] = true;
                            used[j] = true;
                        }
                    }
                }
            }

            for (idx, imp) in current.iter().enumerate() {
                if !used[idx] {
                    prime_implicants.push(imp.clone());
                }
            }

            current = next;
        }

        prime_implicants.sort();
        self.prime_implicants_cache = Some(prime_implicants.clone());
        prime_implicants
    }

    fn find_minimal_cover(&self, prime_implicants: &[Implicant]) -> Vec<Implicant> {
        if prime_implicants.is_empty() || self.minterms.is_empty() {
            return Vec::new();
        }

        let solution_indices = if prime_implicants.len() <= 15 {
            Optimizer::petricks_method(prime_implicants, &self.minterms)
        } else {
            self.greedy_cover(prime_implicants)
        };

        solution_indices.iter()
            .map(|&idx| prime_implicants[idx].clone())
            .collect()
    }

    fn greedy_cover(&self, prime_implicants: &[Implicant]) -> Vec<usize> {
        let mut uncovered: HashSet<u32> = self.minterms.iter().copied().collect();
        let mut result = Vec::new();

        let mut coverage_map: HashMap<u32, Vec<usize>> = HashMap::new();
        for &minterm in &self.minterms {
            for (idx, imp) in prime_implicants.iter().enumerate() {
                if imp.covers(minterm) {
                    coverage_map.entry(minterm).or_insert_with(Vec::new).push(idx);
                }
            }
        }

        let mut used_implicants = HashSet::new();

        for (_, covering) in &coverage_map {
            if covering.len() == 1 {
                let idx = covering[0];
                if used_implicants.insert(idx) {
                    let imp = &prime_implicants[idx];
                    for &m in &imp.minterms {
                        uncovered.remove(&m);
                    }
                    result.push(idx);
                }
            }
        }

        while !uncovered.is_empty() {
            let mut best_idx = None;
            let mut best_score = (0, u8::MAX);

            for (idx, imp) in prime_implicants.iter().enumerate() {
                if used_implicants.contains(&idx) {
                    continue;
                }

                let coverage = imp.minterms.iter()
                    .filter(|&&m| uncovered.contains(&m))
                    .count();

                if coverage > 0 {
                    let literals = imp.literal_count();
                    let score = (coverage, literals);

                    if score.0 > best_score.0 || 
                       (score.0 == best_score.0 && score.1 < best_score.1) {
                        best_score = score;
                        best_idx = Some(idx);
                    }
                }
            }

            if let Some(idx) = best_idx {
                used_implicants.insert(idx);
                let imp = &prime_implicants[idx];
                for &m in &imp.minterms {
                    uncovered.remove(&m);
                }
                result.push(idx);
            } else {
                break;
            }
        }

        result
    }

    pub fn solve(&mut self) -> String {
        if self.minterms.is_empty() {
            return "0".to_string();
        }

        if Optimizer::is_tautology(&self.minterms, self.num_vars) {
            return "1".to_string();
        }

        if Optimizer::is_single_term(&self.minterms) {
            let imp = Implicant::new(self.minterms[0], self.num_vars);
            return imp.to_string(self.num_vars);
        }

        let prime_implicants = self.find_prime_implicants();

        if prime_implicants.is_empty() {
            return "0".to_string();
        }

        let solution = self.find_minimal_cover(&prime_implicants);

        if solution.is_empty() {
            return "0".to_string();
        }

        solution.iter()
            .map(|imp| imp.to_string(self.num_vars))
            .collect::<Vec<_>>()
            .join(" + ")
    }

    pub fn get_prime_implicants(&mut self) -> Vec<Implicant> {
        self.find_prime_implicants()
    }

    pub fn num_vars(&self) -> u32 {
        self.num_vars
    }

    pub fn minterms(&self) -> &[u32] {
        &self.minterms
    }

    pub fn dont_cares(&self) -> &[u32] {
        &self.dont_cares
    }
}
