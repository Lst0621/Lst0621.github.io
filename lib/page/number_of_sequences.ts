import { wasmNumberOfSequencesAll } from "../../lib/tsl/wasm_api.js";
import { draw_table, adjust_table_cell_width } from "../../lib/tsl/visual.js";

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

        const result = wasmNumberOfSequencesAll(arr, [seq1, seq2]);

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

// // Auto-initialize with default values when page loads
// window.addEventListener('DOMContentLoaded', () => {
//     updateTable();
// });

