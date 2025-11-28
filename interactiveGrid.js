export const InteractiveGrid = {
    gridState: null,
    
    init(numVars) {
        const container = document.getElementById('interactiveKmapContainer');
        container.innerHTML = '';
        
        let rows, cols;
        if (numVars === 2) {
            rows = 2; cols = 2;
        } else if (numVars === 3) {
            rows = 2; cols = 4;
        } else if (numVars === 4) {
            rows = 4; cols = 4;
        } else {
            container.innerHTML = '<p class="status status-info">Interactive mode available for 2-4 variables only.</p>';
            this.gridState = null;
            return;
        }
        
        this.gridState = Array.from({ length: rows }, () => 
            Array.from({ length: cols }, () => 0)
        );
        
        const table = this.createInteractiveTable(numVars, rows, cols);
        container.appendChild(table);
    },
    
    createInteractiveTable(numVars, rows, cols) {
        const table = document.createElement('table');
        table.className = 'interactive-kmap-table';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        if (numVars === 2) {
            headerRow.innerHTML = `
                <th></th>
                <th><span class="overline">B</span><sub>0</sub></th>
                <th>B<sub>1</sub></th>
            `;
        } else if (numVars === 3) {
            headerRow.innerHTML = `
                <th></th>
                <th><span class="overline">B</span><span class="overline">C</span><sub>00</sub></th>
                <th><span class="overline">B</span>C<sub>01</sub></th>
                <th>BC<sub>11</sub></th>
                <th>B<span class="overline">C</span><sub>10</sub></th>
            `;
        } else if (numVars === 4) {
            headerRow.innerHTML = `
                <th></th>
                <th><span class="overline">C</span><span class="overline">D</span><sub>00</sub></th>
                <th><span class="overline">C</span>D<sub>01</sub></th>
                <th>CD<sub>11</sub></th>
                <th>C<span class="overline">D</span><sub>10</sub></th>
            `;
        }
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        const GRAY_CODE_TBL = { 2: [0, 1], 4: [0, 1, 3, 2] };
        
        for (let r = 0; r < rows; r++) {
            const row = document.createElement('tr');
            const header = document.createElement('th');
            
            if (numVars === 2) {
                header.innerHTML = r === 0 ? '<span class="overline">A</span><sub>0</sub>' : 'A<sub>1</sub>';
            } else if (numVars === 3) {
                header.innerHTML = r === 0 ? '<span class="overline">A</span><sub>0</sub>' : 'A<sub>1</sub>';
            } else if (numVars === 4) {
                const ab = GRAY_CODE_TBL[4][r];
                const abBinary = ab.toString(2).padStart(2, '0');
                if (abBinary === '00') {
                    header.innerHTML = '<span class="overline">A</span><span class="overline">B</span><sub>00</sub>';
                } else if (abBinary === '01') {
                    header.innerHTML = '<span class="overline">A</span>B<sub>01</sub>';
                } else if (abBinary === '11') {
                    header.innerHTML = 'AB<sub>11</sub>';
                } else if (abBinary === '10') {
                    header.innerHTML = 'A<span class="overline">B</span><sub>10</sub>';
                }
            }
            
            row.appendChild(header);
            
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('td');
                cell.textContent = '0';
                cell.className = 'interactive-cell-0';
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                cell.addEventListener('click', () => this.toggleCell(cell, r, c));
                row.appendChild(cell);
            }
            
            tbody.appendChild(row);
        }
        
        table.appendChild(tbody);
        return table;
    },
    
    toggleCell(cellElement, row, col) {
        const currentState = this.gridState[row][col];
        const nextState = (currentState + 1) % 3;
        
        this.gridState[row][col] = nextState;
        
        if (nextState === 0) {
            cellElement.textContent = '0';
            cellElement.className = 'interactive-cell-0';
        } else if (nextState === 1) {
            cellElement.textContent = '1';
            cellElement.className = 'interactive-cell-1';
        } else {
            cellElement.textContent = 'X';
            cellElement.className = 'interactive-cell-X';
        }
    },
    
    extractState(numVars) {
        const minterms = [];
        const dontCares = [];
        
        // Guard against null gridState
        if (!this.gridState) {
            return { minterms, dontCares };
        }
        
        const GRAY_CODE_TBL = { 2: [0, 1], 4: [0, 1, 3, 2] };
        
        for (let r = 0; r < this.gridState.length; r++) {
            for (let c = 0; c < this.gridState[r].length; c++) {
                let minterm;
                
                if (numVars === 2) {
                    minterm = r * 2 + c;
                } else if (numVars === 3) {
                    const bc = GRAY_CODE_TBL[4][c];
                    minterm = r * 4 + bc;
                } else if (numVars === 4) {
                    const ab = GRAY_CODE_TBL[4][r];
                    const cd = GRAY_CODE_TBL[4][c];
                    minterm = (ab << 2) | cd;
                }
                
                if (this.gridState[r][c] === 1) {
                    minterms.push(minterm);
                } else if (this.gridState[r][c] === 2) {
                    dontCares.push(minterm);
                }
            }
        }
        
        return { minterms, dontCares };
    }
};
