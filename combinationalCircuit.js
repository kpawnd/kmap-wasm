export class Gate {
    constructor(type, label = '') {
        this.type = type; // AND, OR, NOT, NAND, NOR, XOR
        this.label = label;
        this.inputs = [];
        this.output = null;
    }

    evaluate(inputValues) {
        if (this.inputs.length === 0) return false;

        const values = this.inputs.map(input => {
            if (typeof input === 'boolean') return input;
            if (typeof input === 'number') return inputValues[input] || false;
            if (input instanceof Gate) return input.evaluate(inputValues);
            return false;
        });

        switch (this.type) {
            case 'AND':
                return values.every(v => v);
            case 'OR':
                return values.some(v => v);
            case 'NOT':
                return !values[0];
            case 'NAND':
                return !values.every(v => v);
            case 'NOR':
                return !values.some(v => v);
            case 'XOR':
                return values.reduce((a, b) => a !== b, false);
            default:
                return false;
        }
    }
}

export class CircuitSimulator {
    constructor() {
        this.gates = [];
        this.inputs = [];
        this.outputGate = null;
    }

    /**
     * Build circuit from SOP expression
     * @param {string} expression - e.g., "AB' + A'C + BC"
     * @param {string[]} varNames - e.g., ['A', 'B', 'C']
     */
    buildFromExpression(expression, varNames) {
        this.gates = [];
        this.inputs = varNames;

        if (expression === '1') {
            this.outputGate = new Gate('OR', 'always_true');
            this.outputGate.inputs = [true];
            return;
        }

        if (expression === '0') {
            this.outputGate = new Gate('AND', 'always_false');
            this.outputGate.inputs = [false];
            return;
        }

        // Parse terms
        const terms = expression.split('+').map(t => t.trim()).filter(t => t);
        const andGates = [];

        terms.forEach((term, idx) => {
            const andGate = new Gate('AND', `term_${idx}`);
            andGate.inputs = [];
            const termUpper = term.toUpperCase();

            for (let char of termUpper) {
                if (char === "'") continue;
                if (varNames.includes(char)) {
                    const varIndex = varNames.indexOf(char);
                    const isComplemented = termUpper.includes(char + "'");
                    
                    if (isComplemented) {
                        const notGate = new Gate('NOT', `not_${char}`);
                        notGate.inputs = [varIndex];
                        this.gates.push(notGate);
                        andGate.inputs.push(notGate);
                    } else {
                        andGate.inputs.push(varIndex);
                    }
                }
            }

            this.gates.push(andGate);
            andGates.push(andGate);
        });

        // Create output OR gate
        if (andGates.length === 1) {
            this.outputGate = andGates[0];
        } else {
            this.outputGate = new Gate('OR', 'output');
            this.outputGate.inputs = andGates;
            this.gates.push(this.outputGate);
        }
    }

    /**
     * Simulate circuit with given input values
     * @param {Object} inputs - e.g., {A: 1, B: 0, C: 1}
     * @returns {boolean} output value
     */
    simulate(inputs) {
        if (!this.outputGate) return false;

        const inputMap = {};
        Object.keys(inputs).forEach(key => {
            const idx = this.inputs.indexOf(key);
            if (idx !== -1) {
                inputMap[idx] = inputs[key] === 1 || inputs[key] === true;
            }
        });

        return this.outputGate.evaluate(inputMap);
    }

    /**
     * Generate complete truth table
     * @returns {Array} array of {inputs: {}, output: boolean}
     */
    generateTruthTable() {
        const table = [];
        const n = this.inputs.length;
        const maxCombinations = Math.pow(2, n);

        for (let i = 0; i < maxCombinations; i++) {
            const inputObj = {};
            for (let j = 0; j < n; j++) {
                inputObj[this.inputs[j]] = (i >> (n - 1 - j)) & 1;
            }
            const output = this.simulate(inputObj);
            table.push({ inputs: inputObj, output });
        }

        return table;
    }
}

export class CombinationalCircuit {
    constructor() {
        this.circuits = new Map(); // name -> simulator
        this.currentCircuit = null;
    }

    /**
     * Create and store a new circuit
     */
    createCircuit(name, expression, varNames) {
        const simulator = new CircuitSimulator();
        simulator.buildFromExpression(expression, varNames);
        this.circuits.set(name, {
            simulator,
            expression,
            varNames,
            createdAt: new Date()
        });
        this.currentCircuit = name;
        return simulator;
    }

    /**
     * Get circuit by name
     */
    getCircuit(name) {
        return this.circuits.get(name);
    }

    /**
     * List all circuits
     */
    listCircuits() {
        return Array.from(this.circuits.keys());
    }

    /**
     * Delete circuit
     */
    deleteCircuit(name) {
        this.circuits.delete(name);
        if (this.currentCircuit === name) {
            this.currentCircuit = this.circuits.keys().next().value || null;
        }
    }

    /**
     * Compose multiple circuits (circuit output as input to another)
     */
    composeCircuits(name1, name2, outputName) {
        const c1 = this.circuits.get(name1);
        const c2 = this.circuits.get(name2);
        if (!c1 || !c2) return null;

        // This is a placeholder - full composition would be more complex
        return null;
    }

    /**
     * Parse SOP expression and extract terms and variables
     * @param {string} expression - SOP expression like "AB' + A'C + BC"
     * @param {string[]} varNames - Variable names like ['A', 'B', 'C']
     * @returns {Object} Parsed data with terms and variables
     */
    parseExpression(expression, varNames) {
        const terms = [];
        const usedVars = new Set();

        // Handle special cases
        if (expression === '1' || expression === 'true') {
            return { terms: ['1'], variables: varNames, usedVars: new Set() };
        }
        if (expression === '0' || expression === 'false') {
            return { terms: ['0'], variables: varNames, usedVars: new Set() };
        }

        // Split by + and process each term
        expression.split('+').forEach(term => {
            term = term.trim();
            if (term) {
                terms.push(term);
                // Extract variable names from term
                for (let char of term.toUpperCase().replace(/'/g, '')) {
                    if (varNames.includes(char)) {
                        usedVars.add(char);
                    }
                }
            }
        });

        return {
            terms,
            variables: Array.from(varNames).filter(v => usedVars.has(v) || varNames.length <= 2),
            usedVars
        };
    }

    /**
     * Render truth table as HTML table
     */
    renderTruthTable(name) {
        const circuitData = this.circuits.get(name);
        if (!circuitData) return null;

        const table = circuitData.simulator.generateTruthTable();
        const container = document.createElement('div');
        container.className = 'truth-table-container';
        container.style.cssText = `
            margin-top: 1.5rem;
            padding: 1rem;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        `;

        const tableElement = document.createElement('table');
        tableElement.className = 'truth-table';
        tableElement.style.cssText = `
            width: 100%;
            border-collapse: collapse;
            font-family: monospace;
            font-size: 0.9rem;
        `;

        // Header
        const header = tableElement.createTHead();
        const headerRow = header.insertRow();
        circuitData.varNames.forEach(varName => {
            const cell = document.createElement('th');
            cell.textContent = varName;
            cell.style.cssText = `
                padding: 0.75rem;
                border: 1px solid var(--color-border);
                background: var(--color-bg-alt);
                font-weight: 600;
                text-align: center;
            `;
            headerRow.appendChild(cell);
        });
        const outputCell = document.createElement('th');
        outputCell.textContent = 'F';
        outputCell.style.cssText = `
            padding: 0.75rem;
            border: 1px solid var(--color-border);
            background: var(--color-primary);
            color: white;
            font-weight: 600;
            text-align: center;
        `;
        headerRow.appendChild(outputCell);

        // Rows
        const tbody = tableElement.createTBody();
        table.forEach(row => {
            const tr = tbody.insertRow();
            circuitData.varNames.forEach(varName => {
                const cell = tr.insertCell();
                cell.textContent = row.inputs[varName];
                cell.style.cssText = `
                    padding: 0.5rem;
                    border: 1px solid var(--color-border);
                    text-align: center;
                `;
            });
            const outputTd = tr.insertCell();
            outputTd.textContent = row.output ? '1' : '0';
            outputTd.style.cssText = `
                padding: 0.5rem;
                border: 1px solid var(--color-border);
                text-align: center;
                background: ${row.output ? 'var(--color-success)' : 'var(--color-bg-alt)'};
                font-weight: 600;
            `;
        });

        tableElement.appendChild(header);
        tableElement.appendChild(tbody);
        container.appendChild(tableElement);

        return container;
    }

    /**
     * Render interactive circuit simulator
     */
    renderSimulator(name) {
        const circuitData = this.circuits.get(name);
        if (!circuitData) return null;

        const container = document.createElement('div');
        container.className = 'circuit-simulator-container';
        container.style.cssText = `
            margin-top: 1.5rem;
            padding: 1.5rem;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            background: var(--color-bg);
        `;

        const title = document.createElement('h3');
        title.textContent = 'Circuit Simulator';
        title.style.cssText = 'margin-bottom: 1rem; margin-top: 0;';
        container.appendChild(title);

        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'simulator-inputs-grid';
        inputsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        `;

        // Add media query support via CSS class
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 480px) {
                .simulator-inputs-grid {
                    grid-template-columns: 1fr !important;
                    gap: 0.5rem !important;
                }
            }
        `;
        document.head.appendChild(style);

        const inputControls = {};

        circuitData.varNames.forEach(varName => {
            const control = document.createElement('div');
            control.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem;
                border: 1px solid var(--color-border);
                border-radius: 6px;
                background: var(--color-bg-alt);
            `;

            const label = document.createElement('label');
            label.textContent = varName + ':';
            label.style.cssText = 'font-weight: 600; min-width: 30px;';

            const toggle = document.createElement('input');
            toggle.type = 'checkbox';
            toggle.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';
            
            const value = document.createElement('span');
            value.textContent = '0';
            value.style.cssText = `
                font-family: monospace;
                font-weight: bold;
                color: var(--color-primary);
                min-width: 20px;
            `;

            toggle.addEventListener('change', () => {
                value.textContent = toggle.checked ? '1' : '0';
                updateOutput();
            });

            inputControls[varName] = { toggle, value };
            control.appendChild(label);
            control.appendChild(toggle);
            control.appendChild(value);
            inputsContainer.appendChild(control);
        });

        container.appendChild(inputsContainer);

        // Output display
        const outputContainer = document.createElement('div');
        outputContainer.style.cssText = `
            padding: 1rem;
            border: 2px solid var(--color-primary);
            border-radius: 6px;
            background: var(--color-bg-alt);
            text-align: center;
            font-size: 1.2rem;
            font-weight: bold;
        `;

        const outputLabel = document.createElement('div');
        outputLabel.textContent = 'Output (F):';
        outputLabel.style.cssText = 'font-size: 0.9rem; color: var(--color-text-light); margin-bottom: 0.5rem;';

        const outputValue = document.createElement('div');
        outputValue.textContent = '0';
        outputValue.style.cssText = `
            font-size: 2rem;
            color: var(--color-primary);
            font-family: monospace;
        `;

        outputContainer.appendChild(outputLabel);
        outputContainer.appendChild(outputValue);
        container.appendChild(outputContainer);

        const updateOutput = () => {
            const inputs = {};
            Object.keys(inputControls).forEach(varName => {
                inputs[varName] = inputControls[varName].toggle.checked ? 1 : 0;
            });
            const result = circuitData.simulator.simulate(inputs);
            outputValue.textContent = result ? '1' : '0';
            outputValue.style.color = result ? 'var(--color-success)' : 'var(--color-error)';
        };

        return container;
    }
}

export default new CombinationalCircuit();
