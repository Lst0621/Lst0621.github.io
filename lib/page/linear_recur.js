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
var LR_DEFAULT_THRESHOLD = 20;
var lrHandle = null;
function lrCreate(coeffs, recursiveThreshold = LR_DEFAULT_THRESHOLD) {
  if (!moduleInstance) throw new Error("WASM module not initialized.");
  if (lrHandle !== null) {
    moduleInstance._lr_destroy(lrHandle);
  }
  const HEAP32 = getHeap32();
  const arr32 = toInt32Array(coeffs);
  const base = 2048;
  if (HEAP32.length < base + arr32.length) throw new Error("WASM memory exhausted");
  copyToHeap(HEAP32, arr32, base);
  lrHandle = moduleInstance._lr_create(base * 4, arr32.length, recursiveThreshold);
}
function lrDestroy() {
  if (moduleInstance && lrHandle !== null) {
    moduleInstance._lr_destroy(lrHandle);
    lrHandle = null;
  }
}
function lrEvaluate(initialValues, n) {
  if (!moduleInstance || lrHandle === null) throw new Error("Linear recurrence not created. Call lrCreate first.");
  const HEAP32 = getHeap32();
  const init32 = toInt32Array(initialValues);
  const initBase = 2048;
  const resultBase = 4096;
  if (HEAP32.length < resultBase + 2) throw new Error("WASM memory exhausted");
  copyToHeap(HEAP32, init32, initBase);
  moduleInstance._lr_evaluate(lrHandle, initBase * 4, init32.length, n, resultBase * 4);
  const low = HEAP32[resultBase];
  const high = HEAP32[resultBase + 1];
  return low + high * 4294967296;
}
function lrGetCharacteristicPolynomial() {
  if (!moduleInstance || lrHandle === null) throw new Error("Linear recurrence not created. Call lrCreate first.");
  const order = moduleInstance._lr_order(lrHandle);
  const maxLen = order + 1;
  const HEAP32 = getHeap32();
  const base = 2048;
  if (HEAP32.length < base + maxLen) throw new Error("WASM memory exhausted");
  const len = moduleInstance._lr_characteristic_polynomial(lrHandle, base * 4, maxLen);
  const out = [];
  for (let i = 0; i < len; i++) out.push(HEAP32[base + i]);
  return out;
}
function lrGetTransitionMatrixSize() {
  if (!moduleInstance || lrHandle === null) throw new Error("Linear recurrence not created. Call lrCreate first.");
  return moduleInstance._lr_transition_matrix_size(lrHandle);
}
function lrGetTransitionMatrixData() {
  if (!moduleInstance || lrHandle === null) throw new Error("Linear recurrence not created. Call lrCreate first.");
  const n = moduleInstance._lr_transition_matrix_size(lrHandle);
  const size = n * n;
  const HEAP32 = getHeap32();
  const base = 2048;
  if (HEAP32.length < base + size) throw new Error("WASM memory exhausted");
  moduleInstance._lr_transition_matrix_data(lrHandle, base * 4, size);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[base + i]);
  return out;
}
function wasmMatrixPower(data, n, exponent) {
  const HEAP32 = getHeap32();
  const size = n * n;
  if (data.length !== size) throw new Error(`Expected ${size} elements for ${n}\xD7${n} matrix.`);
  const inBase = 2048;
  const outBase = 2048 + size;
  if (HEAP32.length < outBase + size) throw new Error("WASM memory exhausted");
  copyToHeap(HEAP32, toInt32Array(data), inBase);
  moduleInstance._wasm_matrix_power(inBase * 4, n, exponent, outBase * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[outBase + i]);
  return out;
}
function wasmMatrixTimesConst(data, n, scalar) {
  const HEAP32 = getHeap32();
  const size = n * n;
  if (data.length !== size) throw new Error(`Expected ${size} elements for ${n}\xD7${n} matrix.`);
  const inBase = 2048;
  const outBase = 2048 + size;
  if (HEAP32.length < outBase + size) throw new Error("WASM memory exhausted");
  copyToHeap(HEAP32, toInt32Array(data), inBase);
  moduleInstance._wasm_matrix_times_const(inBase * 4, n, scalar, outBase * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[outBase + i]);
  return out;
}
function wasmMatrixAdd(dataA, dataB, n) {
  const HEAP32 = getHeap32();
  const size = n * n;
  if (dataA.length !== size || dataB.length !== size) throw new Error(`Expected ${size} elements for ${n}\xD7${n} matrix.`);
  const baseA = 2048;
  const baseB = 2048 + size;
  const baseOut = 2048 + size * 2;
  if (HEAP32.length < baseOut + size) throw new Error("WASM memory exhausted");
  copyToHeap(HEAP32, toInt32Array(dataA), baseA);
  copyToHeap(HEAP32, toInt32Array(dataB), baseB);
  moduleInstance._wasm_matrix_add(baseA * 4, baseB * 4, n, baseOut * 4);
  const out = [];
  for (let i = 0; i < size; i++) out.push(HEAP32[baseOut + i]);
  return out;
}

// lib/tsl/math/matrix.ts
function array_to_matrix(array, m, n) {
  if (array.length !== m * n) {
    throw new Error(`Array length ${array.length} does not match matrix dimensions ${m}\xD7${n}`);
  }
  const matrix = [];
  for (let i = 0; i < m; i++) {
    const row = array.slice(i * n, (i + 1) * n);
    matrix.push(row);
  }
  return matrix;
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

// lib/page/linear_recur.ts
function matrix_to_latex(M) {
  const rows = M.map((row) => row.join(" & ")).join(" \\\\ ");
  return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
}
function characteristicPolyInT(coeffs, varName) {
  if (coeffs.length === 0) return "0";
  const terms = [];
  for (let d = coeffs.length - 1; d >= 0; d--) {
    const c = coeffs[d];
    if (c === 0) continue;
    const part = d === 0 ? "I" : d === 1 ? varName : `${varName}^${d}`;
    if (c === 1) terms.push(part);
    else if (c === -1) terms.push("-" + part);
    else terms.push((c < 0 ? "" : "+") + c + part);
  }
  return terms.join(" ").replace(/^\+\s*/, "").replace(/\s+\+\s+/g, " + ").replace(/\s+-\s+/g, " - ");
}
function characteristicPolyToLatex(coeffs) {
  if (coeffs.length === 0) return "0";
  const terms = [];
  for (let d = coeffs.length - 1; d >= 0; d--) {
    const c = coeffs[d];
    if (c === 0) continue;
    const xPart = d === 0 ? "" : d === 1 ? "x" : `x^${d}`;
    let s;
    if (d === 0) s = String(c);
    else if (c === 1) s = xPart;
    else if (c === -1) s = "-" + xPart;
    else s = (c < 0 ? "-" : "+") + Math.abs(c) + xPart;
    terms.push(s);
  }
  if (terms.length === 0) return "0";
  return terms.join(" ").replace(/^\+\s*/, "").replace(/\s+\+\s+/g, " + ").replace(/\s+-\s+/g, " - ");
}
function parseCsvInts(input) {
  return input.split(",").map((s) => s.trim()).filter((s) => s.length > 0).map((s) => parseInt(s, 10));
}
function getElementById(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}
function updateLinearRecur() {
  const statusEl = getElementById("lr_status");
  const factorsInput = getElementById("lr_factors");
  const initsInput = getElementById("lr_inits");
  const numTermsInput = getElementById("lr_num_terms");
  const termsInterestInput = getElementById("lr_terms_interest");
  try {
    let formatSeqValue2 = function(x) {
      if (typeof x !== "number" || !Number.isFinite(x)) return "";
      if (Number.isSafeInteger(x)) return String(x);
      return String(x);
    }, partialPolyAtM1d2 = function(k) {
      let sum = wasmMatrixTimesConst(identity1d, orderVal, 0);
      for (let j = 0; j <= k; j++) {
        const term = wasmMatrixTimesConst(powersCache1d[j], orderVal, polyCoeffs[j]);
        sum = wasmMatrixAdd(sum, term, orderVal);
      }
      return sum;
    };
    var formatSeqValue = formatSeqValue2, partialPolyAtM1d = partialPolyAtM1d2;
    const factors = parseCsvInts(factorsInput.value);
    const inits = parseCsvInts(initsInput.value);
    const numTerms = Math.max(0, parseInt(numTermsInput.value, 10) || 10);
    const termsInterestRaw = termsInterestInput.value.trim();
    const termsInterest = termsInterestRaw ? parseCsvInts(termsInterestRaw) : null;
    if (factors.length === 0) {
      statusEl.textContent = "Error: Factors (coefficients) cannot be empty.";
      statusEl.style.color = "red";
      return;
    }
    if (factors.length !== inits.length) {
      statusEl.textContent = `Error: Factors length (${factors.length}) must equal initial values length (${inits.length}).`;
      statusEl.style.color = "red";
      return;
    }
    const order = factors.length;
    lrDestroy();
    lrCreate(factors);
    const initialValues = inits;
    const termIndices = termsInterest && termsInterest.length > 0 ? termsInterest.filter((n) => n >= 0) : Array.from({ length: numTerms }, (_, i) => i);
    const termValues = [];
    for (let i = 0; i < termIndices.length; i++) {
      const val = lrEvaluate(initialValues, termIndices[i]);
      termValues.push(Number.isFinite(val) ? val : 0);
    }
    const recurFormulaEl = document.getElementById("lr_recur_formula");
    if (recurFormulaEl) {
      const terms = factors.map((c, i) => (c === 1 ? "" : c + "\\cdot ") + "a(n-" + (i + 1) + ")");
      recurFormulaEl.textContent = "$a(n) = " + terms.join(" + ") + "$";
      if (typeof window.MathJax !== "undefined" && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([recurFormulaEl]).catch(() => {
        });
      }
    }
    const seqTable = getElementById("lr_seq_table");
    const cols = ["a(n)"];
    draw_table(
      seqTable,
      termIndices,
      cols,
      (row, _col) => termValues[row],
      (n) => String(n),
      (c) => c,
      (x) => typeof x === "number" ? formatSeqValue2(x) : String(x),
      () => "#e8e8e8",
      () => "#f0f0f0",
      () => "#fff"
    );
    const orderVal = lrGetTransitionMatrixSize();
    const mat1d = lrGetTransitionMatrixData();
    const M = array_to_matrix(mat1d, orderVal, orderVal);
    const matLatexEl = document.getElementById("lr_matrix_latex");
    if (matLatexEl) matLatexEl.textContent = "$M = " + matrix_to_latex(M) + "$";
    let polyCoeffs = lrGetCharacteristicPolynomial();
    if (polyCoeffs.length !== order + 1) {
      polyCoeffs = Array.from({ length: order + 1 }, (_, d) => d === order ? 1 : -(factors[order - 1 - d] ?? 0));
    }
    const polyLatexEl = document.getElementById("lr_poly_latex");
    if (polyLatexEl) {
      polyLatexEl.textContent = "$p(x) = " + characteristicPolyToLatex(polyCoeffs) + "$";
      if (typeof window.MathJax !== "undefined" && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([matLatexEl, polyLatexEl].filter(Boolean)).catch(() => {
        });
      }
    }
    const mat1dForPower = lrGetTransitionMatrixData();
    const identity1d = Array.from(
      { length: orderVal * orderVal },
      (_, i) => Math.floor(i / orderVal) === i % orderVal ? 1 : 0
    );
    const powersCache1d = [identity1d];
    for (let j = 1; j <= orderVal; j++) {
      powersCache1d.push(wasmMatrixPower(mat1dForPower, orderVal, j));
    }
    const pM1d = partialPolyAtM1d2(orderVal);
    const pMMatrix = array_to_matrix(pM1d, orderVal, orderVal);
    const MMatrix = array_to_matrix(mat1dForPower, orderVal, orderVal);
    const mLat = matrix_to_latex(MMatrix);
    const formulaEl = document.getElementById("lr_poly_M_formula");
    const substEl = document.getElementById("lr_poly_subst");
    const termsEl = document.getElementById("lr_poly_terms");
    const resultEl = document.getElementById("lr_poly_result");
    const zeroEl = document.getElementById("lr_poly_zero");
    if (formulaEl) formulaEl.textContent = "$p(M) = " + characteristicPolyInT(polyCoeffs, "M") + "$";
    if (substEl) {
      const substTerms = [];
      for (let d = orderVal; d >= 0; d--) {
        const c = polyCoeffs[d];
        if (c === 0) continue;
        const part = d === 0 ? "I" : d === 1 ? mLat : mLat + "^{" + d + "}";
        if (c === 1) substTerms.push(part);
        else if (c === -1) substTerms.push("-" + part);
        else substTerms.push((c < 0 ? "" : "+") + c + part);
      }
      substEl.textContent = "$= " + substTerms.join(" ").replace(/^\+\s*/, "").replace(/\s+\+\s+/g, " + ").replace(/\s+-\s+/g, " - ") + "$";
    }
    if (termsEl) {
      const termMatrices = [];
      for (let j = orderVal; j >= 0; j--) {
        const c = polyCoeffs[j];
        const scaled = array_to_matrix(wasmMatrixTimesConst(powersCache1d[j], orderVal, c), orderVal, orderVal);
        termMatrices.push(matrix_to_latex(scaled));
      }
      termsEl.textContent = "$= " + termMatrices.join(" + ") + "$";
    }
    if (resultEl) resultEl.textContent = "$= " + matrix_to_latex(pMMatrix) + "$";
    if (zeroEl) zeroEl.textContent = "$= \\mathbf{0}$";
    if (typeof window.MathJax !== "undefined" && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([formulaEl, substEl, termsEl, resultEl, zeroEl].filter(Boolean)).catch(() => {
      });
    }
    statusEl.textContent = "Done.";
    statusEl.style.color = "green";
  } catch (err) {
    statusEl.textContent = "Error: " + (err instanceof Error ? err.message : String(err));
    statusEl.style.color = "red";
  }
}
export {
  updateLinearRecur
};
