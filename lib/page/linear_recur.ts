import {
    lrCreate,
    lrDestroy,
    lrEvaluate,
    lrGetCharacteristicPolynomial,
    lrGetTransitionMatrixData,
    lrGetTransitionMatrixSize,
    wasmMatrixAdd,
    wasmMatrixPower,
    wasmMatrixTimesConst,
} from "../tsl/wasm/ts/wasm_api_linear_recur";
import { array_to_matrix } from "../tsl/math/matrix";
import { draw_table } from "../tsl/visual";

/** LaTeX for a matrix (for MathJax). Returns string to wrap in $ $ */
function matrix_to_latex(M: number[][]): string {
    const rows = M.map((row) => row.join(" & ")).join(" \\\\ ");
    return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
}

/** LaTeX for p(T) or p(M): e.g. T^2 - T - I. coeffs ascending degree; use varName (T or M) and I for degree 0. */
function characteristicPolyInT(coeffs: number[], varName: string): string {
    if (coeffs.length === 0) return "0";
    const terms: string[] = [];
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

/** Format characteristic polynomial: p(x) = x^k - ... (descending order, e.g. x^2 - x - 1). */
function characteristicPolyToFormula(coeffs: number[]): string {
    if (coeffs.length === 0) return "0";
    const terms: string[] = [];
    for (let d = coeffs.length - 1; d >= 0; d--) {
        const c = coeffs[d];
        if (c === 0) continue;
        const xPart = d === 0 ? "" : d === 1 ? "x" : `x^${d}`;
        if (d === 0) {
            terms.push(c < 0 ? `- ${-c}` : String(c));
        } else {
            if (c === 1) terms.push(xPart);
            else if (c === -1) terms.push("- " + xPart);
            else terms.push((c < 0 ? "- " : "+ ") + Math.abs(c) + (xPart ? " " + xPart : ""));
        }
    }
    if (terms.length === 0) return "0";
    return terms.join(" ").replace(/^\+\s*/, "").replace(/\s+\+\s+/g, " + ").replace(/\s+-\s+/g, " - ");
}

/** LaTeX for MathJax: p(x) = x^2 - x - 1 (descending order). */
function characteristicPolyToLatex(coeffs: number[]): string {
    if (coeffs.length === 0) return "0";
    const terms: string[] = [];
    for (let d = coeffs.length - 1; d >= 0; d--) {
        const c = coeffs[d];
        if (c === 0) continue;
        const xPart = d === 0 ? "" : d === 1 ? "x" : `x^${d}`;
        let s: string;
        if (d === 0) s = String(c);
        else if (c === 1) s = xPart;
        else if (c === -1) s = "-" + xPart;
        else s = (c < 0 ? "-" : "+") + Math.abs(c) + xPart;
        terms.push(s);
    }
    if (terms.length === 0) return "0";
    return terms.join(" ").replace(/^\+\s*/, "").replace(/\s+\+\s+/g, " + ").replace(/\s+-\s+/g, " - ");
}

function parseCsvInts(input: string): number[] {
    return input
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => parseInt(s, 10));
}

function getElementById<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    return el as T;
}

export function updateLinearRecur() {
    const statusEl = getElementById<HTMLParagraphElement>("lr_status");
    const factorsInput = getElementById<HTMLInputElement>("lr_factors");
    const initsInput = getElementById<HTMLInputElement>("lr_inits");
    const numTermsInput = getElementById<HTMLInputElement>("lr_num_terms");
    const termsInterestInput = getElementById<HTMLInputElement>("lr_terms_interest");

    try {
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

        const termIndices: number[] =
            termsInterest && termsInterest.length > 0
                ? termsInterest.filter((n) => n >= 0)
                : Array.from({ length: numTerms }, (_, i) => i);

        const termValues: number[] = [];
        for (let i = 0; i < termIndices.length; i++) {
            const val = lrEvaluate(initialValues, termIndices[i]);
            termValues.push(Number.isFinite(val) ? val : 0);
        }

        function formatSeqValue(x: number): string {
            if (typeof x !== "number" || !Number.isFinite(x)) return "";
            if (Number.isSafeInteger(x)) return String(x);
            return String(x);
        }

        const recurFormulaEl = document.getElementById("lr_recur_formula");
        if (recurFormulaEl) {
            const terms = factors.map((c, i) => (c === 1 ? "" : c + "\\cdot ") + "a(n-" + (i + 1) + ")");
            recurFormulaEl.textContent = "$a(n) = " + terms.join(" + ") + "$";
            if (typeof (window as any).MathJax !== "undefined" && (window as any).MathJax.typesetPromise) {
                (window as any).MathJax.typesetPromise([recurFormulaEl]).catch(() => {});
            }
        }

        const seqTable = getElementById<HTMLTableElement>("lr_seq_table");
        const cols = ["a(n)"];
        draw_table(
            seqTable,
            termIndices,
            cols,
            (row, _col) => termValues[row],
            (n) => String(n),
            (c) => c,
            (x) => (typeof x === "number" ? formatSeqValue(x) : String(x)),
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
            polyCoeffs = Array.from({ length: order + 1 }, (_, d) => (d === order ? 1 : -(factors[order - 1 - d] ?? 0)));
        }
        const polyLatexEl = document.getElementById("lr_poly_latex");
        if (polyLatexEl) {
            polyLatexEl.textContent = "$p(x) = " + characteristicPolyToLatex(polyCoeffs) + "$";
            if (typeof (window as any).MathJax !== "undefined" && (window as any).MathJax.typesetPromise) {
                (window as any).MathJax.typesetPromise([matLatexEl, polyLatexEl].filter(Boolean)).catch(() => {});
            }
        }
        const mat1dForPower = lrGetTransitionMatrixData();
        const identity1d = Array.from(
            { length: orderVal * orderVal },
            (_, i) => (Math.floor(i / orderVal) === i % orderVal ? 1 : 0)
        );
        const powersCache1d: number[][] = [identity1d];
        for (let j = 1; j <= orderVal; j++) {
            powersCache1d.push(wasmMatrixPower(mat1dForPower, orderVal, j));
        }
        function partialPolyAtM1d(k: number): number[] {
            let sum = wasmMatrixTimesConst(identity1d, orderVal, 0);
            for (let j = 0; j <= k; j++) {
                const term = wasmMatrixTimesConst(powersCache1d[j], orderVal, polyCoeffs[j]);
                sum = wasmMatrixAdd(sum, term, orderVal);
            }
            return sum;
        }
        const pM1d = partialPolyAtM1d(orderVal);
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
            const substTerms: string[] = [];
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
            const termMatrices: string[] = [];
            for (let j = orderVal; j >= 0; j--) {
                const c = polyCoeffs[j];
                const scaled = array_to_matrix(wasmMatrixTimesConst(powersCache1d[j], orderVal, c), orderVal, orderVal);
                termMatrices.push(matrix_to_latex(scaled));
            }
            termsEl.textContent = "$= " + termMatrices.join(" + ") + "$";
        }
        if (resultEl) resultEl.textContent = "$= " + matrix_to_latex(pMMatrix) + "$";
        if (zeroEl) zeroEl.textContent = "$= \\mathbf{0}$";
        if (typeof (window as any).MathJax !== "undefined" && (window as any).MathJax.typesetPromise) {
            (window as any).MathJax.typesetPromise([formulaEl, substEl, termsEl, resultEl, zeroEl].filter(Boolean)).catch(() => {});
        }

        statusEl.textContent = "Done.";
        statusEl.style.color = "green";
    } catch (err) {
        statusEl.textContent = "Error: " + (err instanceof Error ? err.message : String(err));
        statusEl.style.color = "red";
    }
}
