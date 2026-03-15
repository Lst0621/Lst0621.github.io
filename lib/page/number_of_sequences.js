// lib/tsl/wasm_api.ts
import wasmSample from "../tsl/wasm/wasm_out_v1/wasm_sample.js";
var moduleInstance = null;
async function createModulePromise() {
  const g = typeof globalThis !== "undefined" ? globalThis : void 0;
  const proc = g && g.process;
  const inNode = typeof proc?.versions?.node === "string";
  if (inNode) {
    const nodeFs = "node:fs";
    const nodeUrl = "node:url";
    const nodePath = "node:path";
    const fs = await import(nodeFs);
    const url = await import(nodeUrl);
    const path = await import(nodePath);
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const wasmPath = path.join(__dirname, "wasm", "wasm_out_v1", "wasm_sample.wasm");
    const wasmBinary = fs.readFileSync(wasmPath);
    const mod2 = await wasmSample({ wasmBinary });
    moduleInstance = mod2;
    return mod2;
  }
  const mod = await wasmSample();
  moduleInstance = mod;
  return mod;
}
var modulePromise = createModulePromise();
function initWasm() {
  return modulePromise;
}
await initWasm();
function getHeap32() {
  if (!moduleInstance) {
    throw new Error(
      "WASM module not initialized. Call and await initWasm() before using WASM functions."
    );
  }
  const m = moduleInstance;
  const HEAP32 = m.HEAP32;
  if (!HEAP32) {
    throw new Error("Cannot access WASM module HEAP32");
  }
  return HEAP32;
}
function toInt32Array(input) {
  return input instanceof Int32Array ? input : new Int32Array(input);
}
function copyToHeap(HEAP32, data, offsetInInts) {
  for (let i = 0; i < data.length; i++) {
    HEAP32[offsetInInts + i] = data[i];
  }
}
function allocateMemory(HEAP32, arr32, seq32, extraSize = 0) {
  const arrOffsetInInts = 1024;
  const seqOffsetInInts = arrOffsetInInts + arr32.length;
  const outputOffsetInInts = seqOffsetInInts + seq32.length;
  if (HEAP32.length < outputOffsetInInts + extraSize) {
    throw new Error("WASM memory exhausted");
  }
  return { arrOffsetInInts, seqOffsetInInts, outputOffsetInInts };
}
function build_multi_dimensional_array(flatData, dimensions) {
  if (dimensions.length === 0) {
    return flatData[0];
  }
  if (dimensions.length === 1) {
    return Array.from(flatData);
  }
  const currentDim = dimensions[0];
  const remainingDims = dimensions.slice(1);
  const subArraySize = remainingDims.reduce((a, b) => a * (b + 1), 1);
  const result = [];
  for (let i = 0; i <= currentDim; i++) {
    const subData = flatData.slice(i * subArraySize, (i + 1) * subArraySize);
    result.push(build_multi_dimensional_array(subData, remainingDims));
  }
  return result;
}
function wasm_number_of_sequences_all(arr, seq) {
  const HEAP32 = getHeap32();
  const arr32 = toInt32Array(arr);
  const seq32 = toInt32Array(seq);
  if (arr32.length === 0 || seq32.length === 0) {
    return [];
  }
  let totalSize = 1;
  for (let i = 0; i < seq32.length; i++) {
    totalSize *= seq32[i] + 1;
  }
  const { arrOffsetInInts, seqOffsetInInts } = allocateMemory(HEAP32, arr32, seq32, totalSize);
  copyToHeap(HEAP32, arr32, arrOffsetInInts);
  copyToHeap(HEAP32, seq32, seqOffsetInInts);
  const arrPtr = arrOffsetInInts * 4;
  const seqPtr = seqOffsetInInts * 4;
  const outputPtr = moduleInstance._wasm_number_of_sequences_all(arrPtr, arr32.length, seqPtr, seq32.length);
  const outputOffsetFromWasm = outputPtr / 4;
  const flatData = new Int32Array(totalSize);
  for (let i = 0; i < totalSize; i++) {
    flatData[i] = HEAP32[outputOffsetFromWasm + i];
  }
  const dimensions = new Int32Array(seq32);
  return build_multi_dimensional_array(flatData, dimensions);
}

// lib/tsl/visual.ts
function clear_table(table) {
  while (true) {
    if (table.rows.length == 0) {
      break;
    }
    table.deleteRow(0);
  }
}
function draw_table(table, rows, cols, multiply, rows_to_string, cols_to_string, element_to_string, row_get_color, col_get_color, element_get_color) {
  clear_table(table);
  table.style.alignSelf = "center";
  table.style.borderStyle = "solid";
  table.style.textAlign = "center";
  {
    let row = table.insertRow();
    row.insertCell();
    for (let i = 0; i < cols.length; i++) {
      let cell = row.insertCell();
      cell.style.borderStyle = "solid";
      cell.innerHTML = cols_to_string(cols[i]);
      cell.style.background = col_get_color(cols[i]);
    }
  }
  for (let i = 0; i < rows.length; i++) {
    let row = table.insertRow();
    let cell = row.insertCell();
    cell.style.borderStyle = "solid";
    cell.style.background = row_get_color(rows[i]);
    cell.innerHTML = rows_to_string(rows[i]);
    for (let j = 0; j < cols.length; j++) {
      let cell_product = row.insertCell();
      cell_product.style.borderStyle = "solid";
      let element = multiply(i, j);
      cell_product.innerHTML = element_to_string(element);
      cell_product.style.background = element_get_color(i, j);
    }
  }
}
function adjust_table_cell_width(table, cellWidth = "60px", padding = "8px") {
  table.style.tableLayout = "fixed";
  table.style.width = "auto";
  const allCells = table.querySelectorAll("td");
  allCells.forEach((cell) => {
    cell.style.width = cellWidth;
    cell.style.padding = padding;
    cell.style.textAlign = "center";
  });
}

// lib/page/number_of_sequences.ts
function parseArray(input) {
  return input.split(",").map((s) => s.trim()).filter((s) => s.length > 0).map((s) => parseInt(s));
}
function updateExample() {
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
  } catch (err) {
    console.error("Error updating example:", err);
  }
}
function updateTable() {
  try {
    const headSpan = document.getElementById("head_span");
    const statusElement = document.getElementById("status");
    const resultsTable = document.getElementById("results");
    if (!headSpan || !statusElement || !resultsTable) {
      console.error("Required DOM elements not found");
      return;
    }
    const arrInput = document.getElementById("arr_input").value;
    const seq1 = parseInt(document.getElementById("seq1_input").value);
    const seq2 = parseInt(document.getElementById("seq2_input").value);
    const arr = parseArray(arrInput);
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
    headSpan.innerText = `Number of Sequences: arr=[${arr.join(",")}], limits=[${seq1},${seq2}]`;
    statusElement.innerText = "Calculating...";
    statusElement.style.color = "blue";
    const result = wasm_number_of_sequences_all(arr, [seq1, seq2]);
    const rowIndices = Array.from({ length: seq1 + 1 }, (_, i) => i);
    const colIndices = Array.from({ length: seq2 + 1 }, (_, i) => i);
    draw_table(
      resultsTable,
      rowIndices,
      colIndices,
      (row, col) => result[row][col],
      (a) => a.toString(),
      (a) => a.toString(),
      (a) => a.toString(),
      (_a) => "#e0e0e0",
      // Row header color (light grey)
      (_a) => "#e0e0e0",
      // Column header color (light grey)
      (row, _col) => row % 2 === 0 ? "#f9f9f9" : "#ffffff"
      // Alternating row colors
    );
    adjust_table_cell_width(resultsTable);
    updateLaTeXFormula(arr);
    addCellHoverEffects(resultsTable, arr, seq1, seq2, result);
    statusElement.innerText = `\u2713 Calculated ${(seq1 + 1) * (seq2 + 1)} entries successfully`;
    statusElement.style.color = "green";
    updateExample();
  } catch (err) {
    const statusElement = document.getElementById("status");
    if (statusElement) {
      statusElement.innerText = `Error: ${err.message}`;
      statusElement.style.color = "red";
    }
    console.error("Error in updateTable:", err);
  }
}
function getCellAt(table, row, col) {
  const allRows = table.querySelectorAll("tr");
  const targetRowIdx = row + 1;
  if (targetRowIdx < allRows.length) {
    const targetRow = allRows[targetRowIdx];
    const cells = targetRow.querySelectorAll("td");
    const targetCellIdx = col + 1;
    if (targetCellIdx < cells.length) {
      return cells[targetCellIdx];
    }
  }
  return null;
}
function updateFormulaDisplay(row, col, arr, resultValue, result) {
  const formulaDisplay = document.getElementById("formula_display");
  const formulaSubstitution = document.getElementById("formula_substitution");
  if (!formulaDisplay) return;
  const terms = [];
  const values = [];
  arr.forEach((val) => {
    if (row >= val) {
      const depRow = row - val;
      const depValue = result[depRow][col];
      terms.push(`g(${depRow},${col})`);
      values.push(depValue);
    }
  });
  arr.forEach((val) => {
    if (col >= val) {
      const depCol = col - val;
      const depValue = result[row][depCol];
      terms.push(`g(${row},${depCol})`);
      values.push(depValue);
    }
  });
  let formulaStr = `g(${row},${col}) = `;
  if (terms.length === 0) {
    formulaStr += "1 (base case)";
    if (formulaSubstitution) {
      formulaSubstitution.innerText = `${resultValue}`;
    }
  } else {
    formulaStr += terms.join(" + ");
    const valuesStr = values.join(" + ");
    if (formulaSubstitution) {
      formulaSubstitution.innerText = `${resultValue} = ${valuesStr}`;
    }
  }
  formulaDisplay.innerText = formulaStr;
}
function updateLaTeXFormula(arr) {
  const rowTerms = [];
  const colTerms = [];
  arr.forEach((val) => {
    rowTerms.push(`g(m,n-${val})`);
    colTerms.push(`g(m-${val},n)`);
  });
  const rowTermsStr = rowTerms.join("+");
  const colTermsStr = colTerms.join("+");
  const allTerms = `${rowTermsStr}+${colTermsStr}`;
  const html = `$g(m,n) = \\begin{cases} 0 & \\text{if } m<0 \\lor n<0 \\\\ 1 & \\text{if } m=n=0 \\\\ ${allTerms} & \\text{otherwise} \\end{cases}$`;
  const el = document.querySelector('p[align="center"][style*="Arial"]');
  if (!el) {
    return;
  }
  el.innerHTML = html;
  const MathJaxInstance = window.MathJax;
  if (MathJaxInstance && MathJaxInstance.typesetPromise) {
    MathJaxInstance.typesetPromise([el]).then(() => {
      console.log("MathJax rendering complete!");
    });
  }
}
function addCellHoverEffects(table, arr, _maxRow, _maxCol, result) {
  const allRows = table.querySelectorAll("tr");
  allRows.forEach((row, rowIdx) => {
    const cells = row.querySelectorAll("td");
    cells.forEach((cell, colIdx) => {
      const cellElement = cell;
      if (rowIdx === 0 || colIdx === 0) {
        return;
      }
      cellElement.addEventListener("mouseenter", () => {
        cellElement.style.backgroundColor = "#FFD700";
        cellElement.style.cursor = "pointer";
        const actualRow = rowIdx - 1;
        const actualCol = colIdx - 1;
        const resultValue = result[actualRow][actualCol];
        updateFormulaDisplay(actualRow, actualCol, arr, resultValue, result);
        arr.forEach((dependency) => {
          if (actualRow >= dependency) {
            const dependencyRow = actualRow - dependency;
            const dependencyCell = getCellAt(table, dependencyRow, actualCol);
            if (dependencyCell) {
              dependencyCell.style.backgroundColor = "#87CEEB";
            }
          }
          if (actualCol >= dependency) {
            const dependencyCol = actualCol - dependency;
            const dependencyCell = getCellAt(table, actualRow, dependencyCol);
            if (dependencyCell) {
              dependencyCell.style.backgroundColor = "#87CEEB";
            }
          }
        });
      });
      cellElement.addEventListener("mouseleave", () => {
        const allCells = table.querySelectorAll("td");
        allCells.forEach((c) => {
          const tc = c;
          const tr = tc.parentElement;
          if (tr) {
            const allTableRows = Array.from(table.querySelectorAll("tr"));
            const trIdx = allTableRows.indexOf(tr);
            const cellsInRow = tr.querySelectorAll("td");
            const cellIdx = Array.from(cellsInRow).indexOf(tc);
            if (trIdx === 0 || cellIdx === 0) {
              tc.style.backgroundColor = "#e0e0e0";
            } else {
              const dataRowIdx = trIdx - 1;
              tc.style.backgroundColor = dataRowIdx % 2 === 0 ? "#f9f9f9" : "#ffffff";
            }
          }
        });
      });
    });
  });
}
export {
  updateExample,
  updateTable
};
