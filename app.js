import init, { solve_kmap } from './pkg/kmap_solver.js';
import { ExpressionParser } from './expressionParser.js';
import { URLState } from './urlState.js';
import { InteractiveGrid } from './interactiveGrid.js';
import { ImageExporter } from './imageExport.js';

const GRAY_CODE = {
    2: [0, 1],
    4: [0, 1, 3, 2],
};

const LOOP_COLORS = [
    '#FF3B30',
    '#34C759',
    '#007AFF',
    '#FF9500',
    '#AF52DE',
    '#FFCC00',
    '#FF2D55',
    '#5856D6',
];

const VAR_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
const SAVES_KEY = 'kmap_saves_v1';

let batchKMaps = [];
let wasmReady = false;
let currentInputMode = 'minterm';

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadSavedExpressions() {
    try {
        const raw = localStorage.getItem(SAVES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to parse saved expressions', e);
        return [];
    }
}

function saveSavedExpressions(list) {
    try {
        localStorage.setItem(SAVES_KEY, JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save expressions', e);
    }
}

function renderSavedList() {
    const container = document.getElementById('savedList');
    const saved = loadSavedExpressions();

    if (!saved.length) {
        container.innerHTML = '<p class="status status-info">No saved expressions yet.</p>';
        return;
    }

    container.innerHTML = '';
    saved.forEach((item, idx) => {
        const div = document.createElement('div');
        div.className = 'batch-item';
        div.innerHTML = `
            <div class="batch-item-content">
                <strong>${item.expression}</strong><br>
                <span class="saved-meta">
                    ${item.numVars} vars &middot;
                    Minterms: ${item.minterms.join(', ')}${
                        item.dontCares.length
                            ? ` &middot; DC: ${item.dontCares.join(', ')}`
                            : ''
                    }<br>
                    Saved: ${new Date(item.createdAt).toLocaleString()}
                </span>
            </div>
            <button class="btn btn-outline btn-sm" data-save-index="${idx}">
                Delete
            </button>
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('button[data-save-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.saveIndex, 10);
            const list = loadSavedExpressions();
            list.splice(idx, 1);
            saveSavedExpressions(list);
            renderSavedList();
        });
    });
}

function saveCurrentExpression() {
    const resultDiv = document.getElementById('result');
    const expr = resultDiv.textContent.trim();
    
    if (!expr) {
        alert('No minimized expression to save. Solve a K-map first.');
        return;
    }
    
    const numVars = parseInt(document.getElementById('variables').value);
    
    let minterms, dontCares;
    
    if (currentInputMode === 'minterm') {
        const mintermsInput = document.getElementById('minterms').value.trim();
        const dontCaresInput = document.getElementById('dontcares').value.trim();
        minterms = mintermsInput ? mintermsInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x)) : [];
        dontCares = dontCaresInput ? dontCaresInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x)) : [];
    } else if (currentInputMode === 'expression') {
        const expr = document.getElementById('booleanExpr').value.trim();
        if (!expr) {
            alert('No expression available.');
            return;
        }
        try {
            minterms = ExpressionParser.parseExpression(expr, numVars);
            dontCares = [];
        } catch (e) {
            alert('Could not extract minterms from expression.');
            return;
        }
    } else if (currentInputMode === 'interactive') {
        // Extract from interactive grid
        const state = InteractiveGrid.extractState(numVars);
        minterms = state.minterms;
        dontCares = state.dontCares;
    }
    
    const list = loadSavedExpressions();
    list.push({
        id: Date.now().toString(),
        numVars,
        minterms,
        dontCares,
        expression: expr,
        createdAt: new Date().toISOString(),
    });
    saveSavedExpressions(list);
    renderSavedList();
}

async function initWasm() {
    try {
        await init();
        wasmReady = true;
        console.log('Backend loaded successfully');
    } catch (error) {
        console.error('Failed to load:', error);
        alert('Failed to initialize. Please refresh the page.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initWasm();

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('solveBtn').addEventListener('click', solveKMap);
    document.getElementById('addBatchBtn').addEventListener('click', addToBatch);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    const saveBtn = document.getElementById('saveCurrentBtn');
    const clearBtn = document.getElementById('clearSavedBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', saveCurrentExpression);
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear all saved expressions in this browser?')) {
                localStorage.removeItem(SAVES_KEY);
                renderSavedList();
            }
        });
    }

    renderSavedList();
    
    // Initialize new features
    initializeNewFeatures();
});

function initializeNewFeatures() {
    if (URLState.loadFromURL()) {
        setTimeout(() => {
            document.getElementById('solveBtn').click();
        }, 100);
    }
    
    document.getElementById('modeMinterm')?.addEventListener('click', (e) => switchInputMode('minterm', e));
    document.getElementById('modeExpression')?.addEventListener('click', (e) => switchInputMode('expression', e));
    document.getElementById('modeInteractive')?.addEventListener('click', (e) => switchInputMode('interactive', e));
    
    document.getElementById('shareBtn')?.addEventListener('click', handleShare);
    document.getElementById('exportImageBtn')?.addEventListener('click', () => ImageExporter.exportKMapAsPNG());
    
    document.getElementById('variables')?.addEventListener('change', () => {
        if (currentInputMode === 'interactive') {
            InteractiveGrid.init(parseInt(document.getElementById('variables').value));
        }
    });
}

function switchInputMode(mode, event) {
    currentInputMode = mode;
    
    document.querySelectorAll('.btn-mode').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    document.getElementById('mintermInputs').style.display = mode === 'minterm' ? 'block' : 'none';
    document.getElementById('expressionInput').style.display = mode === 'expression' ? 'block' : 'none';
    document.getElementById('interactiveInput').style.display = mode === 'interactive' ? 'block' : 'none';
    
    if (mode === 'interactive') {
        InteractiveGrid.init(parseInt(document.getElementById('variables').value));
    }
}

function solveKMap() {
    if (!wasmReady) {
        alert('Please wait a moment and try again.');
        return;
    }

    let numVars, minterms, dontCares;
    
    try {
        numVars = parseInt(document.getElementById('variables').value);
        
        if (currentInputMode === 'minterm') {
            const mintermsInput = document.getElementById('minterms').value.trim();
            const dontCaresInput = document.getElementById('dontcares').value.trim();
            
            minterms = mintermsInput
                ? mintermsInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
                : [];
            dontCares = dontCaresInput
                ? dontCaresInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
                : [];
        } else if (currentInputMode === 'expression') {
            const expr = document.getElementById('booleanExpr').value.trim();
            if (!expr) {
                alert('Please enter a Boolean expression.');
                return;
            }
            
            minterms = ExpressionParser.parseExpression(expr, numVars);
            dontCares = [];
        } else if (currentInputMode === 'interactive') {
            const state = InteractiveGrid.extractState(numVars);
            minterms = state.minterms;
            dontCares = state.dontCares;
        }

        const maxMinterm = Math.pow(2, numVars) - 1;

        const invalidMinterms = minterms.filter(m => m < 0 || m > maxMinterm);
        const invalidDontCares = dontCares.filter(m => m < 0 || m > maxMinterm);

        if (invalidMinterms.length > 0 || invalidDontCares.length > 0) {
            alert(`Invalid values. For ${numVars} variables, values must be between 0 and ${maxMinterm}.`);
            return;
        }

        if (minterms.length === 0) {
            alert('Please enter at least one minterm.');
            return;
        }

        const result = solve_kmap(
            numVars,
            new Uint32Array(minterms),
            new Uint32Array(dontCares)
        );

        displayResult(result.expression);
        displayKMap(numVars, minterms, dontCares, result.minimal_implicants);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
    }
}

function handleShare() {
    const numVars = parseInt(document.getElementById('variables').value);
    
    let minterms, dontCares;
    
    if (currentInputMode === 'minterm') {
        const mintermsInput = document.getElementById('minterms').value.trim();
        const dontCaresInput = document.getElementById('dontcares').value.trim();
        minterms = mintermsInput ? mintermsInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x)) : [];
        dontCares = dontCaresInput ? dontCaresInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x)) : [];
    } else if (currentInputMode === 'expression') {
        const expr = document.getElementById('booleanExpr').value.trim();
        if (!expr) {
            alert('Please enter an expression first.');
            return;
        }
        try {
            minterms = ExpressionParser.parseExpression(expr, numVars);
            dontCares = [];
        } catch (e) {
            alert('Could not parse expression.');
            return;
        }
    } else if (currentInputMode === 'interactive') {
        const state = InteractiveGrid.extractState(numVars);
        minterms = state.minterms;
        dontCares = state.dontCares;
    }
    
    if (minterms.length === 0) {
        alert('Please solve a K-map first before sharing.');
        return;
    }
    
    const shareUrl = URLState.encodeState(numVars, minterms, dontCares);
    navigator.clipboard.writeText(shareUrl)
        .then(() => ImageExporter.showNotification('Link copied to clipboard!'))
        .catch(() => alert(`Share link: ${shareUrl}`));
}

function displayResult(expression) {
    const resultDiv = document.getElementById('result');
    const resultSection = document.getElementById('resultSection');

    resultDiv.textContent = expression;
    resultSection.style.display = 'block';
}

function displayKMap(numVars, minterms, dontCares, primeImplicants) {
    const kmapDiv = document.getElementById('kmap');
    const kmapSection = document.getElementById('kmapSection');

    if (numVars > 4) {
        kmapDiv.innerHTML = '<p class="status status-info">K-map visualization available for 2-4 variables only.</p>';
        kmapSection.style.display = 'block';
        return;
    }

    kmapDiv.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'kmap-container';

    const table = createKMapTable(numVars, minterms, dontCares);
    container.appendChild(table);

    kmapDiv.appendChild(container);

    setTimeout(() => {
        if (primeImplicants && primeImplicants.length > 0) {
            // Validate that minimal implicants cover all minterms
            const coveredMinterms = new Set();
            primeImplicants.forEach(pi => {
                pi.minterms.forEach(m => coveredMinterms.add(m));
            });
            
            const allMintermssCovered = minterms.every(m => coveredMinterms.has(m));
            if (!allMintermssCovered) {
                console.warn('WARNING: Minimal implicants do not cover all minterms! This indicates an algorithm error.');
            }
            
            // Debug: Log the minimal implicants
            console.log('Minimal implicants for debugging:');
            primeImplicants.forEach((pi, idx) => {
                console.log(`  Group ${idx + 1}: binary="${pi.binary}", minterms=[${pi.minterms.join(', ')}]`);
                // Log the grid positions for each minterm
                const positions = pi.minterms.map(m => {
                    // Map minterm to grid position
                    if (numVars === 3) {
                        const a = Math.floor(m / 4);
                        const bc = m % 4;
                        const grayBC = GRAY_CODE[4];
                        const bcIdx = grayBC.indexOf(bc);
                        return `(r=${a},c=${bcIdx})`;
                    }
                    return '?';
                });
                console.log(`    Positions: ${positions.join(', ')}`);
            });
            
            drawLoops(container, table, numVars, primeImplicants);
            displayPrimeImplicantsList(primeImplicants, numVars);
        }
    }, 100);

    kmapSection.style.display = 'block';
}

function createKMapTable(numVars, minterms, dontCares) {
    const table = document.createElement('table');
    table.className = 'kmap-table';

    if (numVars === 2) {
        return createKMap2Var(table, minterms, dontCares);
    } else if (numVars === 3) {
        return createKMap3Var(table, minterms, dontCares);
    } else if (numVars === 4) {
        return createKMap4Var(table, minterms, dontCares);
    }

    return table;
}

function createKMap2Var(table, minterms, dontCares) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th></th>
        <th><span class="overline">B</span><sub>0</sub></th>
        <th>B<sub>1</sub></th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (let a = 0; a < 2; a++) {
        const row = document.createElement('tr');
        const header = document.createElement('th');
        if (a === 0) {
            header.innerHTML = '<span class="overline">A</span><sub>0</sub>';
        } else {
            header.innerHTML = 'A<sub>1</sub>';
        }
        row.appendChild(header);

        for (let b = 0; b < 2; b++) {
            const minterm = a * 2 + b;
            const cell = createCell(minterm, minterms, dontCares, a, b);
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    return table;
}

function createKMap3Var(table, minterms, dontCares) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headerRow.innerHTML = `
        <th></th>
        <th><span class="overline">B</span><span class="overline">C</span><sub>00</sub></th>
        <th><span class="overline">B</span>C<sub>01</sub></th>
        <th>BC<sub>11</sub></th>
        <th>B<span class="overline">C</span><sub>10</sub></th>
    `;

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const grayBC = GRAY_CODE[4];

    for (let a = 0; a < 2; a++) {
        const row = document.createElement('tr');
        const header = document.createElement('th');
        if (a === 0) {
            header.innerHTML = '<span class="overline">A</span><sub>0</sub>';
        } else {
            header.innerHTML = 'A<sub>1</sub>';
        }
        row.appendChild(header);

        for (let bcIdx = 0; bcIdx < 4; bcIdx++) {
            const bc = grayBC[bcIdx];
            const minterm = a * 4 + bc;
            const cell = createCell(minterm, minterms, dontCares, a, bcIdx);
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    return table;
}

function createKMap4Var(table, minterms, dontCares) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headerRow.innerHTML = `
        <th></th>
        <th><span class="overline">C</span><span class="overline">D</span><sub>00</sub></th>
        <th><span class="overline">C</span>D<sub>01</sub></th>
        <th>CD<sub>11</sub></th>
        <th>C<span class="overline">D</span><sub>10</sub></th>
    `;

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const grayAB = GRAY_CODE[4];
    const grayCD = GRAY_CODE[4];

    for (let abIdx = 0; abIdx < 4; abIdx++) {
        const ab = grayAB[abIdx];
        const row = document.createElement('tr');
        const header = document.createElement('th');
        const abBinary = ab.toString(2).padStart(2, '0');
        let label = '';

        if (abBinary === '00') {
            label = '<span class="overline">A</span><span class="overline">B</span><sub>00</sub>';
        } else if (abBinary === '01') {
            label = '<span class="overline">A</span>B<sub>01</sub>';
        } else if (abBinary === '11') {
            label = 'AB<sub>11</sub>';
        } else if (abBinary === '10') {
            label = 'A<span class="overline">B</span><sub>10</sub>';
        }

        header.innerHTML = label;
        row.appendChild(header);

        for (let cdIdx = 0; cdIdx < 4; cdIdx++) {
            const cd = grayCD[cdIdx];
            const minterm = (ab << 2) | cd;
            const cell = createCell(minterm, minterms, dontCares, abIdx, cdIdx);
            row.appendChild(cell);
        }

        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    return table;
}

function createCell(minterm, minterms, dontCares, row, col) {
    const cell = document.createElement('td');

    if (minterms.includes(minterm)) {
        cell.textContent = '1';
        cell.className = 'cell-one';
    } else if (dontCares.includes(minterm)) {
        cell.textContent = 'X';
        cell.className = 'cell-dontcare';
    } else {
        cell.textContent = '0';
        cell.className = 'cell-zero';
    }

    cell.dataset.minterm = minterm;
    cell.dataset.row = row;
    cell.dataset.col = col;

    return cell;
}

function drawLoops(container, table, numVars, primeImplicants) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('loop-overlay');
    
    const cells = table.querySelectorAll('td[data-minterm]');
    
    let rows, cols;
    if (numVars === 2) { rows = 2; cols = 2; }
    else if (numVars === 3) { rows = 2; cols = 4; }
    else if (numVars === 4) { rows = 4; cols = 4; }
    
    const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
    const containerRect = container.getBoundingClientRect();
    
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const rect = cell.getBoundingClientRect();
        
        grid[row][col] = {
            minterm: parseInt(cell.dataset.minterm),
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height
        };
    });
    
    const padding = 6;
    const cornerRadius = 12;
    
    // Calculate max loop size for opacity scaling
    const maxLoopSize = Math.max(...primeImplicants.map(pi => pi.minterms.length));
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'loop-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
    
    primeImplicants.forEach((pi, idx) => {
        const color = LOOP_COLORS[idx % LOOP_COLORS.length];
        const minterms = new Set(pi.minterms);
        
        // Calculate opacity based on loop size
        const sizeRatio = pi.minterms.length / maxLoopSize;
        const baseOpacity = 0.3 + (sizeRatio * 0.4);
        
        const groupCells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] && minterms.has(grid[r][c].minterm)) {
                    groupCells.push({ r, c, cell: grid[r][c] });
                }
            }
        }
        
        if (groupCells.length === 0) return;
        
        // VALIDATION: Check if group size is power of 2
        if (![1, 2, 4, 8, 16].includes(groupCells.length)) {
            console.warn(`Invalid group size ${groupCells.length} for prime implicant:`, pi);
            return;
        }
        
        const rowSet = new Set(groupCells.map(gc => gc.r));
        const colSet = new Set(groupCells.map(gc => gc.c));
        
        const sortedRows = Array.from(rowSet).sort((a, b) => a - b);
        const sortedCols = Array.from(colSet).sort((a, b) => a - b);
        
        // CRITICAL: Validate that rows and columns are individually contiguous (no gaps)
        let rowsContiguous = true;
        for (let i = 1; i < sortedRows.length; i++) {
            if (sortedRows[i] !== sortedRows[i - 1] + 1) {
                rowsContiguous = false;
                break;
            }
        }
        
        let colsContiguous = true;
        for (let i = 1; i < sortedCols.length; i++) {
            if (sortedCols[i] !== sortedCols[i - 1] + 1) {
                colsContiguous = false;
                break;
            }
        }
        
        // If rows or cols aren't contiguous in their dimension, it's not a valid K-map rectangle
        if (!rowsContiguous || !colsContiguous) {
            console.warn(`Invalid rectangle for prime implicant (rows contiguous: ${rowsContiguous}, cols contiguous: ${colsContiguous}):`, pi);
            return;
        }
        
        // IMPROVED WRAPAROUND DETECTION
        let wrapsHorizontally = false;
        if (sortedCols.length >= 2) {
            const hasLeftEdge = sortedCols.includes(0);
            const hasRightEdge = sortedCols.includes(cols - 1);
            
            if (hasLeftEdge && hasRightEdge && sortedCols.length < cols) {
                // Check if there's actually a gap (not contiguous)
                wrapsHorizontally = !isContiguous(sortedCols, cols);
            }
        }
        
        let wrapsVertically = false;
        if (sortedRows.length >= 2) {
            const hasTopEdge = sortedRows.includes(0);
            const hasBottomEdge = sortedRows.includes(rows - 1);
            
            if (hasTopEdge && hasBottomEdge && sortedRows.length < rows) {
                // Check if there's actually a gap (not contiguous)
                wrapsVertically = !isContiguous(sortedRows, rows);
            }
        }
        
        const loopElements = [];
        
        // Helper function to add hover events
        const addLoopInteraction = (element) => {
            element.style.opacity = baseOpacity;
            element.style.transition = 'opacity 0.2s, stroke-width 0.2s';
            element.style.cursor = 'pointer';
            
            element.addEventListener('mouseenter', (e) => {
                element.style.opacity = '0.9';
                element.style.strokeWidth = '5';
                
                const term = getLoopExpression(pi.binary, numVars);
                
                tooltip.innerHTML = `
                    <strong>Group ${idx + 1}</strong><br>
                    Term: <code>${term}</code><br>
                    Minterms: ${pi.minterms.join(', ')}
                `;
                tooltip.style.display = 'block';
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY + 10 + 'px';
            });
            
            element.addEventListener('mousemove', (e) => {
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY + 10 + 'px';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.opacity = baseOpacity;
                element.style.strokeWidth = '4';
                tooltip.style.display = 'none';
            });
            
            loopElements.push(element);
        };
        
        // Draw loops based on wraparound pattern
        if (wrapsHorizontally && wrapsVertically) {
            // Four corners case
            const corners = [
                [0, 0], [0, cols - 1],
                [rows - 1, 0], [rows - 1, cols - 1]
            ];
            
            corners.forEach(([r, c]) => {
                if (rowSet.has(r) && colSet.has(c) && grid[r][c]) {
                    const cell = grid[r][c];
                    const x = cell.x - padding;
                    const y = cell.y - padding;
                    const w = cell.width + 2 * padding;
                    const h = cell.height + 2 * padding;
                    
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    let d;
                    if (r === 0 && c === 0) {
                        // Top-left: draw right edge and bottom edge
                        d = `M ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h}`;
                    } else if (r === 0 && c === cols - 1) {
                        // Top-right: draw left edge and bottom edge
                        d = `M ${x + w} ${y + h} L ${x} ${y + h} L ${x} ${y}`;
                    } else if (r === rows - 1 && c === 0) {
                        // Bottom-left: draw top edge and right edge
                        d = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h}`;
                    } else {
                        // Bottom-right: draw left edge and top edge
                        d = `M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y}`;
                    }
                    path.setAttribute('d', d);
                    path.classList.add('loop-rect');
                    path.style.stroke = color;
                    path.style.fill = 'none';
                    addLoopInteraction(path);
                    svg.appendChild(path);
                }
            });
        } else if (wrapsHorizontally) {
            // Horizontal wraparound
            const leftCols = sortedCols.filter(c => c <= cols / 2);
            const rightCols = sortedCols.filter(c => c > cols / 2);
            
            [leftCols, rightCols].forEach((colGroup, groupIdx) => {
                if (colGroup.length > 0) {
                    const minCol = Math.min(...colGroup);
                    const maxCol = Math.max(...colGroup);
                    const minRow = Math.min(...sortedRows);
                    const maxRow = Math.max(...sortedRows);
                    
                    const topLeft = grid[minRow][minCol];
                    const bottomRight = grid[maxRow][maxCol];
                    
                    if (topLeft && bottomRight) {
                        const x = topLeft.x - padding;
                        const y = topLeft.y - padding;
                        const w = (bottomRight.x + bottomRight.width) - topLeft.x + 2 * padding;
                        const h = (bottomRight.y + bottomRight.height) - topLeft.y + 2 * padding;
                        
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        let d;
                        if (groupIdx === 0) {
                            // Left group: open on left side
                            d = `M ${x} ${y + h} L ${x + w - cornerRadius} ${y + h} Q ${x + w} ${y + h} ${x + w} ${y + h - cornerRadius} L ${x + w} ${y + cornerRadius} Q ${x + w} ${y} ${x + w - cornerRadius} ${y} L ${x} ${y}`;
                        } else {
                            // Right group: open on right side
                            d = `M ${x + w} ${y} L ${x + cornerRadius} ${y} Q ${x} ${y} ${x} ${y + cornerRadius} L ${x} ${y + h - cornerRadius} Q ${x} ${y + h} ${x + cornerRadius} ${y + h} L ${x + w} ${y + h}`;
                        }
                        path.setAttribute('d', d);
                        path.classList.add('loop-rect');
                        path.style.stroke = color;
                        path.style.fill = 'none';
                        addLoopInteraction(path);
                        svg.appendChild(path);
                    }
                }
            });
        } else if (wrapsVertically) {
            // Vertical wraparound
            const topRows = sortedRows.filter(r => r <= rows / 2);
            const bottomRows = sortedRows.filter(r => r > rows / 2);
            
            [topRows, bottomRows].forEach((rowGroup, groupIdx) => {
                if (rowGroup.length > 0) {
                    const minRow = Math.min(...rowGroup);
                    const maxRow = Math.max(...rowGroup);
                    const minCol = Math.min(...sortedCols);
                    const maxCol = Math.max(...sortedCols);
                    
                    const topLeft = grid[minRow][minCol];
                    const bottomRight = grid[maxRow][maxCol];
                    
                    if (topLeft && bottomRight) {
                        const x = topLeft.x - padding;
                        const y = topLeft.y - padding;
                        const w = (bottomRight.x + bottomRight.width) - topLeft.x + 2 * padding;
                        const h = (bottomRight.y + bottomRight.height) - topLeft.y + 2 * padding;
                        
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        let d;
                        if (groupIdx === 0) {
                            // Top group: open on top side
                            d = `M ${x} ${y} L ${x} ${y + h - cornerRadius} Q ${x} ${y + h} ${x + cornerRadius} ${y + h} L ${x + w - cornerRadius} ${y + h} Q ${x + w} ${y + h} ${x + w} ${y + h - cornerRadius} L ${x + w} ${y}`;
                        } else {
                            // Bottom group: open on bottom side
                            d = `M ${x + w} ${y + h} L ${x + w} ${y + cornerRadius} Q ${x + w} ${y} ${x + w - cornerRadius} ${y} L ${x + cornerRadius} ${y} Q ${x} ${y} ${x} ${y + cornerRadius} L ${x} ${y + h}`;
                        }
                        path.setAttribute('d', d);
                        path.classList.add('loop-rect');
                        path.style.stroke = color;
                        path.style.fill = 'none';
                        addLoopInteraction(path);
                        svg.appendChild(path);
                    }
                }
            });
        } else {
            // No wraparound - simple rectangle
            const minRow = Math.min(...sortedRows);
            const maxRow = Math.max(...sortedRows);
            const minCol = Math.min(...sortedCols);
            const maxCol = Math.max(...sortedCols);
            
            // Validate that the rectangle is actually filled (no gaps in the middle)
            let isValidRectangle = true;
            const expectedCellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
            
            if (groupCells.length !== expectedCellCount) {
                // Cells don't form a complete rectangle - this is invalid for K-maps
                console.warn(`Invalid group shape for prime implicant:`, pi, 
                    `Expected ${expectedCellCount} cells in rectangle, got ${groupCells.length}`);
                isValidRectangle = false;
            }
            
            if (isValidRectangle) {
                const topLeft = grid[minRow][minCol];
                const bottomRight = grid[maxRow][maxCol];
                
                if (topLeft && bottomRight) {
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', topLeft.x - padding);
                    rect.setAttribute('y', topLeft.y - padding);
                    rect.setAttribute('width', (bottomRight.x + bottomRight.width) - topLeft.x + 2 * padding);
                    rect.setAttribute('height', (bottomRight.y + bottomRight.height) - topLeft.y + 2 * padding);
                    rect.setAttribute('rx', cornerRadius);
                    rect.setAttribute('ry', cornerRadius);
                    rect.classList.add('loop-rect');
                    rect.style.stroke = color;
                    addLoopInteraction(rect);
                    svg.appendChild(rect);
                }
            }
        }
    });
    
    container.appendChild(svg);
}

// Helper function to check if array is contiguous (with wraparound support)
function isContiguous(sorted, max) {
    if (sorted.length === 0) return true;
    if (sorted.length === 1) return true;
    
    // Check for normal contiguous sequence
    let isNormalContiguous = true;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
            isNormalContiguous = false;
            break;
        }
    }
    
    if (isNormalContiguous) return true;
    
    // Check for wraparound contiguous: [0, 1, ..., max-2, max-1]
    // Pattern: starts at 0, ends at max-1, with ONE gap in the middle
    if (sorted[0] !== 0 || sorted[sorted.length - 1] !== max - 1) {
        return false;
    }
    
    // Find the gap
    let gapStart = -1;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
            if (gapStart !== -1) {
                // More than one gap - not wraparound contiguous
                return false;
            }
            gapStart = i;
        }
    }
    
    // If we have exactly one gap, check if it's between the wraparound edges
    return gapStart !== -1;
}

function getLoopExpression(binary, numVars) {
    const varNames = VAR_NAMES.slice(0, numVars);
    const terms = [];

    for (let i = 0; i < binary.length; i++) {
        if (binary[i] === '0') {
            terms.push(varNames[i] + "'");
        } else if (binary[i] === '1') {
            terms.push(varNames[i]);
        }
    }

    return terms.length > 0 ? terms.join('') : '1';
}

function displayPrimeImplicantsList(primeImplicants, numVars) {
    const container = document.getElementById('primeImplicantsList');
    container.innerHTML = '<h3>Minimal Prime Implicants (Optimal Solution)</h3>';

    primeImplicants.forEach((pi, idx) => {
        const color = LOOP_COLORS[idx % LOOP_COLORS.length];
        const term = getLoopExpression(pi.binary, numVars);

        const item = document.createElement('div');
        item.className = 'prime-implicant-item';
        item.innerHTML = `
            <div class="color-indicator" style="background-color: ${color};"></div>
            <div>
                <strong>Group ${idx + 1}:</strong> ${term} &nbsp;|&nbsp; Minterms: ${pi.minterms.join(', ')}
            </div>
        `;
        container.appendChild(item);
    });
}

function addToBatch() {
    const numVars = parseInt(document.getElementById('variables').value);
    const mintermsInput = document.getElementById('minterms').value.trim();
    const dontCaresInput = document.getElementById('dontcares').value.trim();
    const resultDiv = document.getElementById('result');

    if (!resultDiv.textContent) {
        alert('Please solve a K-map first.');
        return;
    }

    const minterms = mintermsInput
        ? mintermsInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
        : [];

    const dontCares = dontCaresInput
        ? dontCaresInput.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
        : [];

    batchKMaps.push({
        numVars,
        minterms,
        dontCares,
        expression: resultDiv.textContent,
    });

    renderBatchList();
}

function renderBatchList() {
    const container = document.getElementById('batchList');

    if (batchKMaps.length === 0) {
        container.innerHTML = '<p class="status status-info">No items in batch. Add K-maps to process multiple expressions.</p>';
        return;
    }

    container.innerHTML = '';

    batchKMaps.forEach((kmap, idx) => {
        const item = document.createElement('div');
        item.className = 'batch-item';
        item.innerHTML = `
            <div class="batch-item-content">
                <strong>Item ${idx + 1}:</strong> <code>${kmap.expression}</code><br>
                <small>${kmap.numVars} vars | Minterms: ${kmap.minterms.join(', ')}</small>
            </div>
            <button class="btn btn-outline btn-sm" data-batch-index="${idx}">Remove</button>
        `;
        container.appendChild(item);
    });

    container.querySelectorAll('button[data-batch-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.batchIndex);
            batchKMaps.splice(idx, 1);
            renderBatchList();
        });
    });
}

function exportToCSV() {
    if (batchKMaps.length === 0) {
        alert('No items in batch to export.');
        return;
    }

    let csv = 'Variables,Minterms,DontCares,Expression\n';

    batchKMaps.forEach(kmap => {
        const mintermStr = kmap.minterms.join(';');
        const dontCareStr = kmap.dontCares.join(';');
        csv += `${kmap.numVars},"${mintermStr}","${dontCareStr}","${kmap.expression}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kmap-batch.csv';
    a.click();
    URL.revokeObjectURL(url);
}