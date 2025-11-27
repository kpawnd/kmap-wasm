import init, { solve_kmap } from './pkg/kmap_solver.js';

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

let batchKMaps = [];
let wasmReady = false;

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
});

function solveKMap() {
    if (!wasmReady) {
        alert('Please wait a moment and try again.');
        return;
    }

    const numVars = parseInt(document.getElementById('variables').value);
    const mintermsInput = document.getElementById('minterms').value.trim();
    const dontCaresInput = document.getElementById('dontcares').value.trim();

    const minterms = mintermsInput
        ? mintermsInput
              .split(',')
              .map(x => parseInt(x.trim()))
              .filter(x => !isNaN(x))
        : [];

    const dontCares = dontCaresInput
        ? dontCaresInput
              .split(',')
              .map(x => parseInt(x.trim()))
              .filter(x => !isNaN(x))
        : [];

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

    try {
        const result = solve_kmap(
            numVars,
            new Uint32Array(minterms),
            new Uint32Array(dontCares)
        );

        displayResult(result.expression);
        displayKMap(numVars, minterms, dontCares, result.prime_implicants);
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please check your inputs.');
    }
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
        kmapDiv.innerHTML =
            '<p class="status status-info">K-map visualization available for 2-4 variables only.</p>';
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
        <th>B=0</th>
        <th>B=1</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (let a = 0; a < 2; a++) {
        const row = document.createElement('tr');
        const header = document.createElement('th');
        header.textContent = `A=${a}`;
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
        <th>BC=00</th>
        <th>BC=01</th>
        <th>BC=11</th>
        <th>BC=10</th>
    `;

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const grayBC = GRAY_CODE[4];

    for (let a = 0; a < 2; a++) {
        const row = document.createElement('tr');
        const header = document.createElement('th');
        header.textContent = `A=${a}`;
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
        <th>CD=00</th>
        <th>CD=01</th>
        <th>CD=11</th>
        <th>CD=10</th>
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
        header.textContent = `AB=${ab.toString(2).padStart(2, '0')}`;
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
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'auto';

    const cells = table.querySelectorAll('td[data-minterm]');
    let rows, cols;

    if (numVars === 2) {
        rows = 2;
        cols = 2;
    } else if (numVars === 3) {
        rows = 2;
        cols = 4;
    } else if (numVars === 4) {
        rows = 4;
        cols = 4;
    } else {
        return;
    }

    const grid = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => null)
    );

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
            height: rect.height,
        };
    });

    const padding = 6;
    const cornerRadius = 12;

    const maxLoopSize = Math.max(
        ...primeImplicants.map(pi => pi.minterms.length)
    );

    const tooltip = document.createElement('div');
    tooltip.className = 'loop-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    const loopElements = [];

    const addLoopInteraction = (element, pi, idx, baseOpacity) => {
        element.style.opacity = baseOpacity.toString();
        element.style.transition = 'opacity 0.2s, stroke-width 0.2s';
        element.style.cursor = 'pointer';
        element.style.pointerEvents = 'auto';
        element.dataset.loopIndex = idx;

        element.addEventListener('mouseenter', e => {
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

        element.addEventListener('mousemove', e => {
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
        });

        element.addEventListener('mouseleave', () => {
            element.style.opacity = baseOpacity.toString();
            element.style.strokeWidth = '4';
            tooltip.style.display = 'none';
        });

        loopElements.push(element);
    };

    primeImplicants.forEach((pi, idx) => {
        const color = LOOP_COLORS[idx % LOOP_COLORS.length];
        const mintermsSet = new Set(pi.minterms);

        const sizeRatio = pi.minterms.length / maxLoopSize;
        const baseOpacity = 0.3 + sizeRatio * 0.4;

        const groupCells = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] && mintermsSet.has(grid[r][c].minterm)) {
                    groupCells.push({ r, c, cell: grid[r][c] });
                }
            }
        }

        if (groupCells.length === 0) return;

        const rowSet = new Set(groupCells.map(gc => gc.r));
        const colSet = new Set(groupCells.map(gc => gc.c));

        const sortedRows = Array.from(rowSet).sort((a, b) => a - b);
        const sortedCols = Array.from(colSet).sort((a, b) => a - b);

        let wrapsHorizontally = false;
        if (sortedCols.length > 1) {
            for (let i = 1; i < sortedCols.length; i++) {
                if (sortedCols[i] - sortedCols[i - 1] > 1) {
                    wrapsHorizontally = true;
                    break;
                }
            }
        }

        let wrapsVertically = false;
        if (sortedRows.length > 1) {
            for (let i = 1; i < sortedRows.length; i++) {
                if (sortedRows[i] - sortedRows[i - 1] > 1) {
                    wrapsVertically = true;
                    break;
                }
            }
        }

        if (wrapsHorizontally && wrapsVertically) {
            const corners = [
                [0, 0],
                [0, cols - 1],
                [rows - 1, 0],
                [rows - 1, cols - 1],
            ];

            corners.forEach(([r, c]) => {
                if (rowSet.has(r) && colSet.has(c) && grid[r][c]) {
                    const cell = grid[r][c];
                    const x = cell.x - padding;
                    const y = cell.y - padding;
                    const w = cell.width + 2 * padding;
                    const h = cell.height + 2 * padding;

                    const path = document.createElementNS(
                        'http://www.w3.org/2000/svg',
                        'path'
                    );

                    let d = '';

                    if (r === 0 && c === 0) {
                        d = `
                            M ${x} ${y + h}
                            L ${x} ${y + cornerRadius}
                            Q ${x} ${y} ${x + cornerRadius} ${y}
                            L ${x + w} ${y}
                            L ${x + w} ${y + h}
                            Z
                        `;
                    } else if (r === 0 && c === cols - 1) {
                        d = `
                            M ${x} ${y}
                            L ${x + w - cornerRadius} ${y}
                            Q ${x + w} ${y} ${x + w} ${y + cornerRadius}
                            L ${x + w} ${y + h}
                            L ${x} ${y + h}
                            Z
                        `;
                    } else if (r === rows - 1 && c === 0) {
                        d = `
                            M ${x} ${y}
                            L ${x + w} ${y}
                            L ${x + w} ${y + h}
                            L ${x + cornerRadius} ${y + h}
                            Q ${x} ${y + h} ${x} ${y + h - cornerRadius}
                            Z
                        `;
                    } else {
                        d = `
                            M ${x} ${y}
                            L ${x} ${y + h}
                            L ${x + w - cornerRadius} ${y + h}
                            Q ${x + w} ${y + h} ${x + w} ${y + h - cornerRadius}
                            L ${x + w} ${y}
                            Z
                        `;
                    }

                    path.setAttribute('d', d.trim());
                    path.classList.add('loop-rect');
                    path.style.stroke = color;
                    path.style.fill = 'none';
                    path.style.strokeWidth = '4';

                    addLoopInteraction(path, pi, idx, baseOpacity);
                    svg.appendChild(path);
                }
            });
        } else if (wrapsHorizontally) {
            const leftCols = sortedCols.filter(c => c < cols / 2);
            const rightCols = sortedCols.filter(c => c >= cols / 2);

            [leftCols, rightCols].forEach((colGroup, groupIdx) => {
                if (colGroup.length === 0) return;

                const minCol = Math.min(...colGroup);
                const maxCol = Math.max(...colGroup);
                const minRow = Math.min(...sortedRows);
                const maxRow = Math.max(...sortedRows);

                const topLeft = grid[minRow][minCol];
                const bottomRight = grid[maxRow][maxCol];

                if (!topLeft || !bottomRight) return;

                const x = topLeft.x - padding;
                const y = topLeft.y - padding;
                const w =
                    bottomRight.x +
                    bottomRight.width -
                    topLeft.x +
                    2 * padding;
                const h =
                    bottomRight.y +
                    bottomRight.height -
                    topLeft.y +
                    2 * padding;

                const path = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'path'
                );

                let d = '';

                if (groupIdx === 0) {
                    d = `
                        M ${x} ${y + h}
                        L ${x + w - cornerRadius} ${y + h}
                        Q ${x + w} ${y + h} ${x + w} ${y + h - cornerRadius}
                        L ${x + w} ${y + cornerRadius}
                        Q ${x + w} ${y} ${x + w - cornerRadius} ${y}
                        L ${x} ${y}
                    `;
                } else {
                    d = `
                        M ${x + w} ${y}
                        L ${x + cornerRadius} ${y}
                        Q ${x} ${y} ${x} ${y + cornerRadius}
                        L ${x} ${y + h - cornerRadius}
                        Q ${x} ${y + h} ${x + cornerRadius} ${y + h}
                        L ${x + w} ${y + h}
                    `;
                }

                path.setAttribute('d', d.trim());
                path.classList.add('loop-rect');
                path.style.stroke = color;
                path.style.fill = 'none';
                path.style.strokeWidth = '4';

                addLoopInteraction(path, pi, idx, baseOpacity);
                svg.appendChild(path);
            });
        } else if (wrapsVertically) {
            const topRows = sortedRows.filter(r => r < rows / 2);
            const bottomRows = sortedRows.filter(r => r >= rows / 2);

            [topRows, bottomRows].forEach((rowGroup, groupIdx) => {
                if (rowGroup.length === 0) return;

                const minRow = Math.min(...rowGroup);
                const maxRow = Math.max(...rowGroup);
                const minCol = Math.min(...sortedCols);
                const maxCol = Math.max(...sortedCols);

                const topLeft = grid[minRow][minCol];
                const bottomRight = grid[maxRow][maxCol];

                if (!topLeft || !bottomRight) return;

                const x = topLeft.x - padding;
                const y = topLeft.y - padding;
                const w =
                    bottomRight.x +
                    bottomRight.width -
                    topLeft.x +
                    2 * padding;
                const h =
                    bottomRight.y +
                    bottomRight.height -
                    topLeft.y +
                    2 * padding;

                const path = document.createElementNS(
                    'http://www.w3.org/2000/svg',
                    'path'
                );

                let d = '';

                if (groupIdx === 0) {
                    d = `
                        M ${x} ${y}
                        L ${x} ${y + h - cornerRadius}
                        Q ${x} ${y + h} ${x + cornerRadius} ${y + h}
                        L ${x + w - cornerRadius} ${y + h}
                        Q ${x + w} ${y + h} ${x + w} ${y + h - cornerRadius}
                        L ${x + w} ${y}
                    `;
                } else {
                    d = `
                        M ${x + w} ${y + h}
                        L ${x + w} ${y + cornerRadius}
                        Q ${x + w} ${y} ${x + w - cornerRadius} ${y}
                        L ${x + cornerRadius} ${y}
                        Q ${x} ${y} ${x} ${y + cornerRadius}
                        L ${x} ${y + h}
                    `;
                }

                path.setAttribute('d', d.trim());
                path.classList.add('loop-rect');
                path.style.stroke = color;
                path.style.fill = 'none';
                path.style.strokeWidth = '4';

                addLoopInteraction(path, pi, idx, baseOpacity);
                svg.appendChild(path);
            });
        } else {
            const minRow = Math.min(...sortedRows);
            const maxRow = Math.max(...sortedRows);
            const minCol = Math.min(...sortedCols);
            const maxCol = Math.max(...sortedCols);

            const topLeft = grid[minRow][minCol];
            const bottomRight = grid[maxRow][maxCol];

            if (!topLeft || !bottomRight) return;

            const rect = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'rect'
            );

            rect.setAttribute('x', topLeft.x - padding);
            rect.setAttribute('y', topLeft.y - padding);
            rect.setAttribute(
                'width',
                bottomRight.x +
                    bottomRight.width -
                    topLeft.x +
                    2 * padding
            );
            rect.setAttribute(
                'height',
                bottomRight.y +
                    bottomRight.height -
                    topLeft.y +
                    2 * padding
            );
            rect.setAttribute('rx', cornerRadius);
            rect.setAttribute('ry', cornerRadius);
            rect.classList.add('loop-rect');
            rect.style.stroke = color;
            rect.style.fill = 'none';
            rect.style.strokeWidth = '4';

            addLoopInteraction(rect, pi, idx, baseOpacity);
            svg.appendChild(rect);
        }
    });

    container.appendChild(svg);
}

function getMintermPosition(minterm, numVars) {
    if (numVars === 2) {
        return {
            row: Math.floor(minterm / 2),
            col: minterm % 2,
        };
    } else if (numVars === 3) {
        const a = (minterm >> 2) & 1;
        const bc = minterm & 3;
        const grayBC = GRAY_CODE[4];
        return {
            row: a,
            col: grayBC.indexOf(bc),
        };
    } else if (numVars === 4) {
        const ab = (minterm >> 2) & 3;
        const cd = minterm & 3;
        const grayAB = GRAY_CODE[4];
        const grayCD = GRAY_CODE[4];
        return {
            row: grayAB.indexOf(ab),
            col: grayCD.indexOf(cd),
        };
    }

    return { row: 0, col: 0 };
}

function getLoopExpression(binary, numVars) {
    const varNames = VAR_NAMES.slice(0, numVars);
    const terms = [];

    for (let i = 0; i < binary.length; i++) {
        if (binary[i] === '1') {
            terms.push(varNames[i]);
        } else if (binary[i] === '0') {
            terms.push(varNames[i] + "'");
        }
    }

    return terms.length > 0 ? terms.join('') : '1';
}

function displayPrimeImplicantsList(primeImplicants, numVars) {
    const listDiv = document.getElementById('primeImplicantsList');
    listDiv.innerHTML = '<h3>Prime Implicants</h3>';

    primeImplicants.forEach((pi, idx) => {
        const color = LOOP_COLORS[idx % LOOP_COLORS.length];
        const expression = getLoopExpression(pi.binary, numVars);

        const item = document.createElement('div');
        item.className = 'prime-implicant-item';
        item.style.cursor = 'pointer';
        item.style.transition = 'all 0.2s ease';

        item.innerHTML = `
            <span class="color-indicator" style="background: ${color};"></span>
            <span>
                <strong>${expression}</strong>
                covers minterms ${pi.minterms.join(', ')}
                <span style="color: var(--color-text-secondary); font-family: monospace;">
                    ${pi.binary}
                </span>
            </span>
        `;

        item.addEventListener('mouseenter', () => {
            const rect = document.querySelector(`.loop-rect[data-loop-index="${idx}"]`);
            if (rect) {
                rect.style.opacity = '1';
                rect.style.strokeWidth = '3';
                rect.style.filter = `drop-shadow(0 0 6px ${color})`;
            }
            item.style.transform = 'translateX(5px)';
            item.style.background = 'var(--color-bg-tertiary)';
        });

        item.addEventListener('mouseleave', () => {
            const rect = document.querySelector(`.loop-rect[data-loop-index="${idx}"]`);
            if (rect) {
                rect.style.opacity = '';
                rect.style.strokeWidth = '2';
                rect.style.filter = 'none';
            }
            item.style.transform = 'translateX(0)';
            item.style.background = '';
        });

        listDiv.appendChild(item);
    });
}

function addToBatch() {
    const numVars = parseInt(document.getElementById('variables').value);
    const mintermsInput = document.getElementById('minterms').value.trim();
    const dontCaresInput = document.getElementById('dontcares').value.trim();

    if (!mintermsInput) {
        alert('Please enter minterms before adding to batch.');
        return;
    }

    const minterms = mintermsInput
        .split(',')
        .map(x => parseInt(x.trim()))
        .filter(x => !isNaN(x));

    const dontCares = dontCaresInput
        ? dontCaresInput
              .split(',')
              .map(x => parseInt(x.trim()))
              .filter(x => !isNaN(x))
        : [];

    if (!wasmReady) {
        alert('Please wait for initialization.');
        return;
    }

    const result = solve_kmap(
        numVars,
        new Uint32Array(minterms),
        new Uint32Array(dontCares)
    );

    batchKMaps.push({
        numVars,
        minterms,
        dontCares,
        expression: result.expression,
    });

    updateBatchList();
}

function updateBatchList() {
    const container = document.getElementById('batchList');

    if (batchKMaps.length === 0) {
        container.innerHTML =
            '<p class="status status-info">No items in batch. Add K-maps to process multiple expressions.</p>';
        return;
    }

    container.innerHTML = '';

    batchKMaps.forEach((kmap, idx) => {
        const item = document.createElement('div');
        item.className = 'batch-item';
        item.innerHTML = `
            <div class="batch-item-content">
                <strong>K-Map ${idx + 1}</strong> - ${kmap.numVars} variables<br>
                Minterms: ${kmap.minterms.join(', ')}<br>
                Expression: <code>${kmap.expression}</code>
            </div>
            <button class="btn btn-outline btn-sm" onclick="removeBatchItem(${idx})">
                Remove
            </button>
        `;
        container.appendChild(item);
    });
}

window.removeBatchItem = function (index) {
    batchKMaps.splice(index, 1);
    updateBatchList();
};

function exportToCSV() {
    if (batchKMaps.length === 0) {
        alert('No items to export. Add K-maps to batch first.');
        return;
    }

    let csv = 'Variables,Minterms,Dont Cares,Expression\n';

    batchKMaps.forEach(kmap => {
        csv += `${kmap.numVars},"${kmap.minterms.join(
            ','
        )}","${kmap.dontCares.join(',')}",${kmap.expression}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'kmap-batch.csv';
    a.click();

    URL.revokeObjectURL(url);
}