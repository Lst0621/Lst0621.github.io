import { wasmNumberOfSequencesAll } from "../../lib/tsl/wasm_api.js";
function parseArray(input) {
    return input.split(',').map(s => s.trim()).filter(s => s.length > 0).map(s => parseInt(s));
}
export function updateExample() {
    try {
        const arrInput = document.getElementById("arr_input").value;
        const seq1 = document.getElementById("seq1_input").value;
        const seq2 = document.getElementById("seq2_input").value;
        const exampleArrElement = document.getElementById("example_arr");
        const exampleLimitsElement = document.getElementById("example_limits");
        if (exampleArrElement) {
            exampleArrElement.innerText = `[${arrInput}]`;
        }
        if (exampleLimitsElement) {
            exampleLimitsElement.innerText = `[${seq1}, ${seq2}]`;
        }
    }
    catch (err) {
        console.error("Error updating example:", err);
    }
}
export function updateTable() {
    try {
        // Get elements (deferred until needed)
        const headSpan = document.getElementById("head_span");
        const statusElement = document.getElementById("status");
        const resultsTable = document.getElementById("results");
        // Validate elements exist
        if (!headSpan || !statusElement || !resultsTable) {
            console.error("Required DOM elements not found");
            return;
        }
        // Get input values
        const arrInput = document.getElementById("arr_input").value;
        const seq1 = parseInt(document.getElementById("seq1_input").value);
        const seq2 = parseInt(document.getElementById("seq2_input").value);
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
        // Clear existing table
        while (resultsTable.rows.length > 0) {
            resultsTable.deleteRow(0);
        }
        // Build table header
        const thead = resultsTable.querySelector('thead');
        thead.innerHTML = '';
        const headerRow = thead.insertRow();
        headerRow.style.backgroundColor = "#333";
        headerRow.style.color = "white";
        headerRow.style.fontWeight = "bold";
        const headerCell = headerRow.insertCell();
        headerCell.innerText = "\\";
        headerCell.style.border = "1px solid black";
        headerCell.style.padding = "8px";
        for (let j = 0; j <= seq2; j++) {
            const cell = headerRow.insertCell();
            cell.innerText = j.toString();
            cell.style.border = "1px solid black";
            cell.style.padding = "8px";
            cell.style.textAlign = "center";
            cell.style.minWidth = "60px";
        }
        // Build table body
        const tbody = resultsTable.querySelector('tbody');
        tbody.innerHTML = '';
        for (let i = 0; i <= seq1; i++) {
            const row = tbody.insertRow();
            row.style.backgroundColor = i % 2 === 0 ? "#f9f9f9" : "#ffffff";
            // Row header
            const rowHeader = row.insertCell();
            rowHeader.innerText = i.toString();
            rowHeader.style.border = "1px solid black";
            rowHeader.style.padding = "8px";
            rowHeader.style.fontWeight = "bold";
            rowHeader.style.backgroundColor = "#e0e0e0";
            rowHeader.style.textAlign = "center";
            // Data cells
            for (let j = 0; j <= seq2; j++) {
                const cell = row.insertCell();
                const value = result[i][j];
                cell.innerText = value.toString();
                cell.style.border = "1px solid black";
                cell.style.padding = "8px";
                cell.style.textAlign = "right";
            }
        }
        statusElement.innerText = `✓ Calculated ${(seq1 + 1) * (seq2 + 1)} entries successfully`;
        statusElement.style.color = "green";
        // Update example to match current inputs
        updateExample();
    }
    catch (err) {
        const statusElement = document.getElementById("status");
        if (statusElement) {
            statusElement.innerText = `Error: ${err.message}`;
            statusElement.style.color = "red";
        }
        console.error("Error in updateTable:", err);
    }
}
// Auto-initialize with default values when page loads
window.addEventListener('DOMContentLoaded', () => {
    updateTable();
});
