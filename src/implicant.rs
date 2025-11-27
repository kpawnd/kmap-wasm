#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Implicant {
    pub mask: u32,      
    pub value: u32,     
    pub minterms: Vec<u32>,
    literal_count: u8,
}

impl Implicant {
    #[inline]
    pub fn new(minterm: u32, num_vars: u32) -> Self {
        let mask = (1 << num_vars) - 1;
        Self {
            mask,
            value: minterm,
            minterms: vec![minterm],
            literal_count: num_vars as u8,
        }
    }

    #[inline]
    pub fn can_combine(&self, other: &Self) -> bool {
        self.mask == other.mask && (self.value ^ other.value).count_ones() == 1
    }

    #[inline]
    pub fn combine(&self, other: &Self) -> Self {
        let diff_bit = self.value ^ other.value;
        let new_mask = self.mask & !diff_bit;
        let new_value = self.value & new_mask;

        let mut minterms = Vec::with_capacity(self.minterms.len() + other.minterms.len());
        let (mut i, mut j) = (0, 0);

        while i < self.minterms.len() && j < other.minterms.len() {
            match self.minterms[i].cmp(&other.minterms[j]) {
                std::cmp::Ordering::Less => {
                    minterms.push(self.minterms[i]);
                    i += 1;
                }
                std::cmp::Ordering::Equal => {
                    minterms.push(self.minterms[i]);
                    i += 1;
                    j += 1;
                }
                std::cmp::Ordering::Greater => {
                    minterms.push(other.minterms[j]);
                    j += 1;
                }
            }
        }
        minterms.extend_from_slice(&self.minterms[i..]);
        minterms.extend_from_slice(&other.minterms[j..]);

        Self {
            mask: new_mask,
            value: new_value,
            minterms,
            literal_count: new_mask.count_ones() as u8,
        }
    }

    #[inline]
    pub fn covers(&self, minterm: u32) -> bool {
        (minterm & self.mask) == (self.value & self.mask)
    }

    #[inline]
    pub fn literal_count(&self) -> u8 {
        self.literal_count
    }

    #[inline]
    pub fn cost(&self) -> (u8, usize) {
        (self.literal_count, self.minterms.len())
    }

    pub fn to_string(&self, num_vars: u32) -> String {
        let var_names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        let mut terms = Vec::new();

        for i in (0..num_vars).rev() {
            let bit = 1 << i;
            if self.mask & bit != 0 {
                if self.value & bit != 0 {
                    terms.push(var_names[i as usize].to_string());
                } else {
                    terms.push(format!("{}'", var_names[i as usize]));
                }
            }
        }

        if terms.is_empty() {
            "1".to_string()
        } else {
            terms.join("")
        }
    }
}

impl PartialOrd for Implicant {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Implicant {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        match self.literal_count.cmp(&other.literal_count) {
            std::cmp::Ordering::Equal => other.minterms.len().cmp(&self.minterms.len()),
            ord => ord,
        }
    }
}
