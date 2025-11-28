export const ExpressionParser = {
    parseExpression(expr, numVars) {
        try {
            expr = expr.toUpperCase()
                      .replace(/'/g, "'")
                      .replace(/!/g, "'")
                      .replace(/\s+/g, '');
            
            const terms = expr.split('+').map(t => t.trim()).filter(t => t);
            const varNames = ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, numVars);
            const allMinterms = new Set();
            
            for (const term of terms) {
                const minterms = this.termToMinterms(term, varNames, numVars);
                minterms.forEach(m => allMinterms.add(m));
            }
            
            return Array.from(allMinterms).sort((a, b) => a - b);
        } catch (error) {
            throw new Error('Invalid expression format');
        }
    },
    
    termToMinterms(term, varNames, numVars) {
        const maxMinterms = Math.pow(2, numVars);
        const literals = {};
        
        let i = 0;
        while (i < term.length) {
            const char = term[i];
            if (varNames.includes(char)) {
                const isComplemented = term[i + 1] === "'";
                literals[char] = !isComplemented;
                i += isComplemented ? 2 : 1;
            } else {
                i++;
            }
        }
        
        const minterms = [];
        for (let m = 0; m < maxMinterms; m++) {
            let matches = true;
            for (let v = 0; v < numVars; v++) {
                const varName = varNames[v];
                const bitValue = (m >> (numVars - 1 - v)) & 1;
                
                if (varName in literals) {
                    if (literals[varName] !== Boolean(bitValue)) {
                        matches = false;
                        break;
                    }
                }
            }
            if (matches) minterms.push(m);
        }
        
        return minterms;
    }
};
