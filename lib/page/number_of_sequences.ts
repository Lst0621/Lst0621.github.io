import { wasm_number_of_sequences_all } from "../tsl/wasm/ts/wasm_api_number_of_sequences";
import { draw_table, adjust_table_cell_width } from "../tsl/visual";

function parseArray(input: string): number[] {
    return input.split(',').map(s => s.trim()).filter(s => s.length > 0).map(s => parseInt(s));
}

export function updateExample() {
    try {
        const arrInput = (document.getElementById("arr_input") as HTMLInputElement).value;
        const seq1 = (document.getElementById("seq1_input") as HTMLInputElement).value;
        const seq2 = (document.getElementById("seq2_input") as HTMLInputElement).value;

        const exampleArrElement = document.getElementById("example_arr") as HTMLSpanElement;
        const exampleLimitsElement = document.getElementById("example_limits") as HTMLSpanElement;

        if (exampleArrElement) {
            exampleArrElement.innerText = `[${arrInput}]`;
        }
        if (exampleLimitsElement) {
            exampleLimitsElement.innerText = `[${seq1}, ${seq2}]`;
        }
    } catch (err) {
        console.error("Error updating example:", err);
    }
}

export function updateTable() {
    try {
        // Get elements (deferred until needed)
        const headSpan = document.getElementById("head_span") as HTMLSpanElement;
        const statusElement = document.getElementById("status") as HTMLParagraphElement;
        const resultsTable = document.getElementById("results") as HTMLTableElement;

        // Validate elements exist
        if (!headSpan || !statusElement || !resultsTable) {
            console.error("Required DOM elements not found");
            return;
        }

        // Get input values
        const arrInput = (document.getElementById("arr_input") as HTMLInputElement).value;
        const seq1 = parseInt((document.getElementById("seq1_input") as HTMLInputElement).value);
        const seq2 = parseInt((document.getElementById("seq2_input") as HTMLInputElement).value);

        // Parse array
        const arr = parseArray(arrInput);

        // Validate inputs
        if (arr.length === 0) {
            statusElement.innerText = "Error: Array cannot be empty";
            statusElement.style.color = "red";
            return;
        }

        if (seq1 < 0 || seq2 < 0) {
            statusElement.innerText = "Error: Sequence limits must be non-negative";
            statusElement.style.color = "red";
            return;
        }

        // Update title
        headSpan.innerText = `Number of Sequences: arr=[${arr.join(',')}], limits=[${seq1},${seq2}]`;

        // Call WASM function
        statusElement.innerText = "Calculating...";
        statusElement.style.color = "blue";

        const result = wasm_number_of_sequences_all(arr, [seq1, seq2]);

        // Create row and column arrays for indices
        const rowIndices = Array.from({ length: seq1 + 1 }, (_, i) => i);
        const colIndices = Array.from({ length: seq2 + 1 }, (_, i) => i);

        // Use draw_table to render the results
        draw_table(
            resultsTable,
            rowIndices,
            colIndices,
            (row: number, col: number) => result[row][col],
            (a: number) => a.toString(),
            (a: number) => a.toString(),
            (a: number) => a.toString(),
            (_a: number) => "#e0e0e0", // Row header color (light grey)
            (_a: number) => "#e0e0e0", // Column header color (light grey)
            (row: number, _col: number) => row % 2 === 0 ? "#f9f9f9" : "#ffffff" // Alternating row colors
        );

        // Set uniform cell width for all table cells
        adjust_table_cell_width(resultsTable);

        // Update LaTeX formula with actual array values
        updateLaTeXFormula(arr);

        // Add hover effects to highlight dependencies
        addCellHoverEffects(resultsTable, arr, seq1, seq2, result);

        statusElement.innerText = `✓ Calculated ${(seq1 + 1) * (seq2 + 1)} entries successfully`;
        statusElement.style.color = "green";

        // Update example to match current inputs
        updateExample();

    } catch (err: any) {
        const statusElement = document.getElementById("status") as HTMLParagraphElement;
        if (statusElement) {
            statusElement.innerText = `Error: ${err.message}`;
            statusElement.style.color = "red";
        }
        console.error("Error in updateTable:", err);
    }
}

function getCellAt(table: HTMLTableElement, row: number, col: number): HTMLTableCellElement | null {
    // Get all rows in the table (including header)
    const allRows = table.querySelectorAll('tr');

    // Data row index + 1 for header row
    const targetRowIdx = row + 1;

    if (targetRowIdx < allRows.length) {
        const targetRow = allRows[targetRowIdx];
        const cells = targetRow.querySelectorAll('td');

        // Data column index + 1 for header column
        const targetCellIdx = col + 1;

        if (targetCellIdx < cells.length) {
            return cells[targetCellIdx] as HTMLTableCellElement;
        }
    }
    return null;
}

function updateFormulaDisplay(row: number, col: number, arr: number[], resultValue: number, result: number[][]) {
    const formulaDisplay = document.getElementById("formula_display") as HTMLParagraphElement;
    const formulaSubstitution = document.getElementById("formula_substitution") as HTMLParagraphElement;
    if (!formulaDisplay) return;

    // Build the formula breakdown with actual values
    const terms: string[] = [];
    const values: number[] = [];

    // Add row dependencies
    arr.forEach((val: number) => {
        if (row >= val) {
            const depRow = row - val;
            const depValue = result[depRow][col];
            terms.push(`g(${depRow},${col})`);
            values.push(depValue);
        }
    });

    // Add column dependencies
    arr.forEach((val: number) => {
        if (col >= val) {
            const depCol = col - val;
            const depValue = result[row][depCol];
            terms.push(`g(${row},${depCol})`);
            values.push(depValue);
        }
    });

    // Build the formula string
    let formulaStr = `g(${row},${col}) = `;

    if (terms.length === 0) {
        formulaStr += "1 (base case)";
        if (formulaSubstitution) {
            formulaSubstitution.innerText = `${resultValue}`;
        }
    } else {
        formulaStr += terms.join(" + ");
        // Add substitution line showing the values and result (swapped: result = values)
        const valuesStr = values.join(" + ");
        if (formulaSubstitution) {
            formulaSubstitution.innerText = `${resultValue} = ${valuesStr}`;
        }
    }

    formulaDisplay.innerText = formulaStr;
}

function updateLaTeXFormula(arr: number[]) {
    // Build the row and column dependency terms
    const rowTerms: string[] = [];
    const colTerms: string[] = [];

    arr.forEach((val: number) => {
        rowTerms.push(`g(m,n-${val})`);
        colTerms.push(`g(m-${val},n)`);
    });

    // Combine all terms
    const rowTermsStr = rowTerms.join('+');
    const colTermsStr = colTerms.join('+');
    const allTerms = `${rowTermsStr}+${colTermsStr}`;

    // Build the HTML with LaTeX formula
    const html = `$g(m,n) = \\begin{cases} 0 & \\text{if } m<0 \\lor n<0 \\\\ 1 & \\text{if } m=n=0 \\\\ ${allTerms} & \\text{otherwise} \\end{cases}$`;

    // Find and update the formula paragraph
    const el = document.querySelector('p[align="center"][style*="Arial"]') as HTMLElement;
    if (!el) {
        return;
    }

    el.innerHTML = html;

    // Trigger MathJax to re-render
    const MathJaxInstance = (window as any).MathJax;
    if (MathJaxInstance && MathJaxInstance.typesetPromise) {
        MathJaxInstance.typesetPromise([el]).then(() => {
            console.log("MathJax rendering complete!");
        });
    }
}

function addCellHoverEffects(table: HTMLTableElement, arr: number[], _maxRow: number, _maxCol: number, result: number[][]) {
    // Get all rows including header
    const allRows = table.querySelectorAll('tr');

    allRows.forEach((row: Element, rowIdx: number) => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell: Element, colIdx: number) => {
            const cellElement = cell as HTMLTableCellElement;

            // Skip header row (rowIdx === 0) and header column (colIdx === 0)
            if (rowIdx === 0 || colIdx === 0) {
                return; // Don't add hover effects to headers
            }

            cellElement.addEventListener('mouseenter', () => {
                // Highlight the hovered cell
                cellElement.style.backgroundColor = "#FFD700"; // Gold color
                cellElement.style.cursor = "pointer";

                // Convert table indices to data indices
                // rowIdx includes header, so data row = rowIdx - 1
                // colIdx includes header, so data col = colIdx - 1
                const actualRow = rowIdx - 1;
                const actualCol = colIdx - 1;

                // Get the actual value from the result
                const resultValue = result[actualRow][actualCol];

                // Update dynamic formula display with dependency values
                updateFormulaDisplay(actualRow, actualCol, arr, resultValue, result);

                // Highlight dependency cells based on formula:
                // g(m,n) depends on g(m-arr[i], n) and g(m, n-arr[i])
                arr.forEach((dependency: number) => {
                    // Dependencies in row direction: (row - arrayValue, col)
                    if (actualRow >= dependency) {
                        const dependencyRow = actualRow - dependency;
                        const dependencyCell = getCellAt(table, dependencyRow, actualCol);
                        if (dependencyCell) {
                            dependencyCell.style.backgroundColor = "#87CEEB"; // Light blue
                        }
                    }

                    // Dependencies in column direction: (row, col - arrayValue)
                    if (actualCol >= dependency) {
                        const dependencyCol = actualCol - dependency;
                        const dependencyCell = getCellAt(table, actualRow, dependencyCol);
                        if (dependencyCell) {
                            dependencyCell.style.backgroundColor = "#87CEEB"; // Light blue
                        }
                    }
                });
            });

            cellElement.addEventListener('mouseleave', () => {
                // Restore original colors to all cells
                const allCells = table.querySelectorAll('td');
                allCells.forEach((c: Element) => {
                    const tc = c as HTMLTableCellElement;
                    const tr = tc.parentElement;
                    if (tr) {
                        // Get all rows to find the index
                        const allTableRows = Array.from(table.querySelectorAll('tr'));
                        const trIdx = allTableRows.indexOf(tr as HTMLTableRowElement);

                        // Get all cells in this row
                        const cellsInRow = tr.querySelectorAll('td');
                        const cellIdx = Array.from(cellsInRow).indexOf(tc);

                        // Header row or header column cells
                        if (trIdx === 0 || cellIdx === 0) {
                            tc.style.backgroundColor = "#e0e0e0";
                        } else {
                            // Data cells - alternating colors based on actual data row
                            const dataRowIdx = trIdx - 1; // Subtract 1 for header row
                            tc.style.backgroundColor = dataRowIdx % 2 === 0 ? "#f9f9f9" : "#ffffff";
                        }
                    }
                });
            });
        });
    });
}

