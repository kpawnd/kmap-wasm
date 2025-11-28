// circuitGenerator.js
// ES6 module that exports a singleton CircuitGenerator
// Uses Mermaid for reliable circuit diagram rendering (GitHub Pages compatible)

/**
 * CircuitGenerator: generates a two-level AND-OR logic circuit diagram from a minimized SOP string.
 * Uses Mermaid flowchart DSL for automatic layout and rendering.
 * - Use `generate(expression, varNames)` to produce an HTMLElement with embedded Mermaid diagram.
 * - Supports inputs A..F (2-6 variables), prime notation (A') and combining overline (e.g., Ā).
 */
export class CircuitGenerator {
    constructor() {
        this.mermaidLoaded = false;
        this.initMermaid();
    }

    /**
     * Initialize Mermaid CDN loader.
     */
    initMermaid() {
        if (typeof mermaid === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
            script.onload = () => {
                if (typeof mermaid !== 'undefined') {
                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                    mermaid.initialize({ 
                        startOnLoad: true, 
                        theme: isDark ? 'dark' : 'default',
                        themeVariables: isDark ? {
                            primaryColor: '#2a2724',
                            primaryTextColor: '#ede8e3',
                            primaryBorderColor: '#d4956a',
                            lineColor: '#d4956a',
                            secondaryColor: '#3d3935',
                            tertiaryColor: '#1f1d1a',
                            textColor: '#ede8e3',
                            nodeTextColor: '#ede8e3'
                        } : {}
                    });
                    this.mermaidLoaded = true;
                }
            };
            script.onerror = () => {
                console.warn('Failed to load Mermaid from CDN');
            };
            document.head.appendChild(script);
        } else {
            this.mermaidLoaded = true;
        }
    }

    /**
     * Reinitialize mermaid with the current theme
     */
    updateTheme() {
        if (typeof mermaid !== 'undefined') {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            mermaid.initialize({ 
                startOnLoad: false, 
                theme: isDark ? 'dark' : 'default',
                themeVariables: isDark ? {
                    primaryColor: '#2a2724',
                    primaryTextColor: '#ede8e3',
                    primaryBorderColor: '#d4956a',
                    lineColor: '#d4956a',
                    secondaryColor: '#3d3935',
                    tertiaryColor: '#1f1d1a',
                    textColor: '#ede8e3',
                    nodeTextColor: '#ede8e3'
                } : {}
            });
        }
    }

    /**
     * Generate a circuit diagram for a minimized SOP expression.
     * @param {string} expression - Minimized SOP (e.g., "AB' + A'C + BC") or "0"/"1".
     * @param {string[]} varNames - Array of variable names in order (e.g., ['A','B','C','D']).
     * @returns {HTMLElement} - A container with the rendered Mermaid diagram.
     */
    generate(expression, varNames = ['A','B','C','D']) {
        // Normalize inputs
        const vars = varNames.slice(0, Math.max(2, Math.min(6, varNames.length)));

        // Parse expression
        const parsed = this._parseSOP(expression, vars);

        // Create container
        const container = document.createElement('div');
        container.className = 'circuit-container-mermaid';
        container.style.padding = '12px';
        container.style.borderRadius = '6px';
        container.style.backgroundColor = 'var(--color-bg)';
        container.style.border = '1px solid var(--color-border)';
        container.style.overflowX = 'auto';
        container.style.minHeight = '100px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';

        // Handle constants
        if (parsed.isConstant) {
            const text = document.createElement('p');
            text.style.fontSize = '14px';
            text.style.color = 'var(--color-text)';
            text.style.margin = '8px 0';
            text.textContent = parsed.constantValue === 1 ? 'F = 1 (Constant)' : 'F = 0 (Constant)';
            container.appendChild(text);
            return container;
        }

        // Handle no terms
        if (parsed.terms.length === 0) {
            const text = document.createElement('p');
            text.style.fontSize = '14px';
            text.style.color = 'var(--color-text)';
            text.style.margin = '8px 0';
            text.textContent = 'No terms to display';
            container.appendChild(text);
            return container;
        }

        // Build Mermaid diagram
        const mermaidDef = this._buildMermaidDiagram(parsed, vars);

        // Create Mermaid div
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = mermaidDef;
        mermaidDiv.style.width = '100%';
        mermaidDiv.style.minHeight = '200px';
        mermaidDiv.style.display = 'flex';
        mermaidDiv.style.justifyContent = 'center';
        mermaidDiv.style.alignItems = 'center';

        container.appendChild(mermaidDiv);

        // Ensure rendering happens after DOM insertion
        this._renderMermaidAsync(container);

        return container;
    }

    /**
     * Render Mermaid diagrams asynchronously to ensure they appear after DOM insertion.
     */
    _renderMermaidAsync(container) {
        // Queue rendering on the next microtask
        Promise.resolve().then(() => {
            this._renderMermaid(container);
        });
    }

    /**
     * Render Mermaid diagrams in the container.
     */
    _renderMermaid(container) {
        if (typeof mermaid === 'undefined') {
            console.warn('Mermaid library not loaded');
            return;
        }

        try {
            // Try mermaid v10+ API with run()
            if (typeof mermaid.run === 'function') {
                mermaid.run();
                console.log('Mermaid rendered with mermaid.run()');
            }
            // Fallback: try contentLoaded()
            else if (typeof mermaid.contentLoaded === 'function') {
                mermaid.contentLoaded();
                console.log('Mermaid rendered with mermaid.contentLoaded()');
            }
            // Last resort: try renderCard (older API)
            else if (typeof mermaid.render === 'function') {
                console.log('Mermaid render method available but not used');
            }
            else {
                console.warn('No suitable Mermaid render method found');
            }
        } catch (e) {
            console.error('Mermaid render failed:', e);
            // Show error in container
            const mermaidDiv = container.querySelector('.mermaid');
            if (mermaidDiv) {
                const errorDiv = document.createElement('pre');
                errorDiv.style.color = 'red';
                errorDiv.style.fontSize = '12px';
                errorDiv.style.padding = '8px';
                errorDiv.style.whiteSpace = 'pre-wrap';
                errorDiv.textContent = 'Diagram failed to render:\n' + e.message;
                mermaidDiv.after(errorDiv);
            }
        }
    }

    /**
     * Build a Mermaid flowchart definition for the circuit.
     * Nodes represent inputs, AND gates, OR gate, and output.
     * Edges represent signal flow (wires).
     */
    _buildMermaidDiagram(parsed, vars) {
        let diagram = 'graph LR\n';

        // Input nodes
        for (let i = 0; i < vars.length; i++) {
            diagram += `  I${i}["${vars[i]}"]\n`;
        }

        diagram += '\n';

        // AND gate nodes and logic
        const andGateIds = [];
        parsed.terms.forEach((term, tIdx) => {
            const validLits = term.literals.filter(l => typeof l.index === 'number' && l.index >= 0);
            if (validLits.length === 0) return;

            const andId = `AND${tIdx}`;
            andGateIds.push(andId);

            // Build AND label (e.g., "A AND (NOT B) AND C" or simplified "A·B'·C")
            let andLabel = validLits.map(lit => {
                const varName = vars[lit.index];
                return lit.negated ? `${varName}'` : varName;
            }).join('·');

            diagram += `  ${andId}["${andLabel}"]\n`;

            // Connect inputs to AND
            validLits.forEach(lit => {
                diagram += `  I${lit.index} --> ${andId}\n`;
            });
        });

        diagram += '\n';

        // OR gate node or direct output
        if (andGateIds.length === 1) {
            // Single term: direct output
            diagram += `  ${andGateIds[0]} --> F["F"]\n`;
        } else if (andGateIds.length > 1) {
            // Multiple terms: OR them together
            diagram += `  OR["OR"]\n`;
            andGateIds.forEach(andId => {
                diagram += `  ${andId} --> OR\n`;
            });
            diagram += `  OR --> F["F"]\n`;
        }

        // Debug log
        console.log('Mermaid diagram generated:');
        console.log(diagram);

        return diagram;
    }

    /**
     * Parse an SOP string into internal term/literal representation.
     * Accepts primes (A') and combining overline (e.g., Ā). Handles constants "0" and "1".
     * @param {string} expr
     * @param {string[]} vars
     * @returns {{terms: Array, constantValue: number|null, isConstant: boolean}}
     */
    _parseSOP(expr, vars) {
        const trimmed = (expr || '').trim();
        if (trimmed === '') return { terms: [], constantValue: null, isConstant: false };

        // Constant checks
        if (/^0$/.test(trimmed)) return { terms: [], constantValue: 0, isConstant: true };
        if (/^1$/.test(trimmed)) return { terms: [], constantValue: 1, isConstant: true };

        // Split on + but ignore plus inside other constructs
        const termStrs = trimmed.split(/\s*\+\s*/);
        const terms = termStrs.map(t => {
            const s = t.replace(/\s+/g, '');
            const literals = [];
            // Support combining overline (U+0305, U+00AF, U+0304) or prime (')
            const overlineRegex = /[\u0305\u00AF\u0304]/;

            // Iterate through characters grouping letters with immediate modifiers
            let i = 0;
            while (i < s.length) {
                const ch = s[i];
                if (/[A-Za-z]/.test(ch)) {
                    let neg = false;
                    // check next char for prime
                    if (s[i+1] === "'") {
                        neg = true;
                        i += 2;
                    } else if (i + 1 < s.length && overlineRegex.test(s[i+1])) {
                        neg = true;
                        i += 2;
                    } else {
                        i += 1;
                    }

                    const idx = vars.indexOf(ch.toUpperCase());
                    if (idx === -1) {
                        // If variable not found, still include but index -1 (will be ignored later)
                        literals.push({ name: ch.toUpperCase(), index: -1, negated: neg });
                    } else {
                        literals.push({ name: vars[idx], index: idx, negated: neg });
                    }
                } else {
                    // skip unknown
                    i += 1;
                }
            }

            return { raw: t, literals };
        });

        return { terms, constantValue: null, isConstant: false };
    }
}

// Export a default singleton
const generator = new CircuitGenerator();
export default generator;
