import { draw_table } from "../tsl/visual";

function parseCsvBigInts(input: string): bigint[] {
    return input
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => {
            if (!/^-?\d+$/.test(s)) {
                throw new Error(`Invalid integer: "${s}"`);
            }
            return BigInt(s);
        });
}

function getElementById<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`Element #${id} not found`);
    }
    return el as T;
}

function coeffsToLatex(coeffs: bigint[], seqName: string): string {
    // coeffs are [c1, c2, ..., ck] for: s(n) = sum c_i * s(n-i)
    const terms: string[] = [];
    for (let i = 0; i < coeffs.length; i++) {
        const c = coeffs[i];
        if (c === 0n) {
            continue;
        }
        const lag = i + 1;
        const base = `${seqName}(n-${lag})`;
        if (c === 1n) {
            terms.push(base);
        } else if (c === -1n) {
            terms.push(`-${base}`);
        } else if (c < 0n) {
            terms.push(`-${(-c).toString()}\\cdot ${base}`);
        } else {
            terms.push(`${c.toString()}\\cdot ${base}`);
        }
    }
    if (terms.length === 0) {
        return `${seqName}(n) = 0`;
    }
    return `${seqName}(n) = ${terms.join(" + ").replace(/\+\s*-/g, "- ")}`;
}

function evalRecurrenceTerms(coeffs: bigint[], init: bigint[], nTerms: number): bigint[] {
    if (coeffs.length === 0) {
        throw new Error("Coefficients cannot be empty.");
    }
    if (coeffs.length !== init.length) {
        throw new Error(`Coefficients length (${coeffs.length}) must equal init length (${init.length}).`);
    }
    const k = coeffs.length;
    const out: bigint[] = init.slice(0, Math.min(k, nTerms));
    while (out.length < nTerms) {
        let next = 0n;
        const idx = out.length;
        for (let j = 0; j < k; j++) {
            next += coeffs[j] * out[idx - 1 - j];
        }
        out.push(next);
    }
    return out;
}

function buildDenominatorPoly(coeffs: bigint[]): bigint[] {
    // Q(x) = 1 - c1 x - c2 x^2 - ... - ck x^k
    const q: bigint[] = [1n];
    for (let i = 0; i < coeffs.length; i++) {
        q.push(-coeffs[i]);
    }
    return q;
}

function polyMul(a: bigint[], b: bigint[]): bigint[] {
    const out: bigint[] = Array.from({ length: a.length + b.length - 1 }, () => 0n);
    for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
            out[i + j] += a[i] * b[j];
        }
    }
    // trim trailing zeros
    while (out.length > 1 && out[out.length - 1] === 0n) {
        out.pop();
    }
    return out;
}

function denominatorToRecurrenceCoeffs(q: bigint[]): bigint[] {
    // Q(x) = 1 - c1 x - ... - ck x^k, with q[0]=1.
    if (q.length < 2) {
        throw new Error("Output denominator degree must be >= 1.");
    }
    if (q[0] !== 1n) {
        throw new Error("Expected normalized Q(0)=1.");
    }
    const k = q.length - 1;
    const c: bigint[] = [];
    for (let i = 1; i <= k; i++) {
        c.push(-q[i]);
    }
    return c;
}

function evalRecurrenceFromInit(coeffs: bigint[], init: bigint[], nTerms: number): bigint[] {
    const k = coeffs.length;
    if (init.length !== k) {
        throw new Error("init length must match order.");
    }
    const out: bigint[] = init.slice();
    while (out.length < nTerms) {
        const n = out.length;
        let s = 0n;
        for (let i = 0; i < k; i++) {
            s += coeffs[i] * out[n - 1 - i];
        }
        out.push(s);
    }
    return out;
}

function recurrenceCalcString(coeffs: bigint[], g: bigint[], n: number): string {
    const k = coeffs.length;
    if (n < k) {
        return "-";
    }
    // Build something like: c1*g(n-1)+... = value
    const parts: string[] = [];
    let sum = 0n;
    const maxShow = 6;
    for (let i = 0; i < k; i++) {
        const c = coeffs[i];
        const term = c * g[n - 1 - i];
        sum += term;
        if (parts.length < maxShow) {
            parts.push(`${c.toString()}·${g[n - 1 - i].toString()}`);
        }
    }
    const prefix = parts.join(" + ").replace(/\+\s-\s/g, "- ");
    const ellipsis = k > maxShow ? " + ..." : "";
    return `${prefix}${ellipsis} = ${sum.toString()}`;
}

function convolveDirect(a: bigint[], b: bigint[], nTerms: number): bigint[] {
    const out: bigint[] = Array.from({ length: nTerms }, () => 0n);
    for (let n = 0; n < nTerms; n++) {
        let s = 0n;
        for (let i = 0; i <= n; i++) {
            s += a[i] * b[n - i];
        }
        out[n] = s;
    }
    return out;
}

function convolvePolynomialStyle(a: bigint[], b: bigint[], nTerms: number): bigint[] {
    // Polynomial multiply of truncated coefficient lists, then truncate back to nTerms.
    const out: bigint[] = Array.from({ length: nTerms }, () => 0n);
    for (let i = 0; i < nTerms; i++) {
        for (let j = 0; j < nTerms; j++) {
            const deg = i + j;
            if (deg >= nTerms) {
                break;
            }
            out[deg] += a[i] * b[j];
        }
    }
    return out;
}

export function updateLinearRecurConvolution(): void {
    const statusEl = getElementById<HTMLParagraphElement>("lrc_status");
    const factorsAInput = getElementById<HTMLInputElement>("lrc_factors_a");
    const initsAInput = getElementById<HTMLInputElement>("lrc_inits_a");
    const factorsBInput = getElementById<HTMLInputElement>("lrc_factors_b");
    const initsBInput = getElementById<HTMLInputElement>("lrc_inits_b");
    const numTermsInput = getElementById<HTMLInputElement>("lrc_num_terms");

    try {
        const coeffsA = parseCsvBigInts(factorsAInput.value);
        const initA = parseCsvBigInts(initsAInput.value);
        const coeffsB = parseCsvBigInts(factorsBInput.value);
        const initB = parseCsvBigInts(initsBInput.value);
        const defaultNTerms = 15;
        const parsedNTerms = parseInt(numTermsInput.value, 10);
        const nTerms = Number.isFinite(parsedNTerms) && parsedNTerms > 0 ? parsedNTerms : defaultNTerms;
        numTermsInput.value = String(nTerms);

        const a = evalRecurrenceTerms(coeffsA, initA, nTerms);
        const b = evalRecurrenceTerms(coeffsB, initB, nTerms);

        const gDirect = convolveDirect(a, b, nTerms);
        const gPoly = convolvePolynomialStyle(a, b, nTerms);

        // Output recurrence from denominators: Qg = Qa * Qb.
        const qA = buildDenominatorPoly(coeffsA);
        const qB = buildDenominatorPoly(coeffsB);
        const qG = polyMul(qA, qB);
        const coeffsG = denominatorToRecurrenceCoeffs(qG);
        const kG = coeffsG.length;

        const initG = gDirect.slice(0, Math.min(kG, gDirect.length));
        if (initG.length !== kG) {
            throw new Error(`Need at least ${kG} terms to seed g recurrence, got ${initG.length}. Increase N.`);
        }
        const gByRec = evalRecurrenceFromInit(coeffsG, initG, nTerms);

        let firstMismatch: number | null = null;
        for (let i = 0; i < nTerms; i++) {
            if (gDirect[i] !== gPoly[i]) {
                firstMismatch = i;
                break;
            }
        }

        let firstMismatchRec: number | null = null;
        for (let i = kG; i < nTerms; i++) {
            if (gByRec[i] !== gDirect[i]) {
                firstMismatchRec = i;
                break;
            }
        }

        if (firstMismatch === null && firstMismatchRec === null) {
            statusEl.textContent =
                `$g(n)=\\sum\\limits_{i=0}^{n} a(i)\\,b(n-i)$ matches polynomial multiply and the derived recurrence (order ${kG}).`;
            statusEl.style.color = "green";
        } else if (firstMismatch !== null) {
            statusEl.textContent = `Mismatch: direct convolution vs polynomial multiply at n=${firstMismatch}.`;
            statusEl.style.color = "red";
        } else {
            statusEl.textContent = `Mismatch: derived recurrence vs direct convolution at n=${firstMismatchRec}.`;
            statusEl.style.color = "red";
        }

        if (typeof (window as any).MathJax !== "undefined" && (window as any).MathJax.typesetPromise) {
            (window as any).MathJax.typesetPromise([statusEl]).catch(() => {});
        }

        const formulaConvEl = document.getElementById("lrc_formula_conv");
        const formulaAEl = document.getElementById("lrc_formula_a");
        const formulaBEl = document.getElementById("lrc_formula_b");
        const formulaGEl = document.getElementById("lrc_formula_g");
        if (formulaConvEl) {
            formulaConvEl.textContent =
                "$g(n) = \\sum\\limits_{i=0}^{n} a(i) \\cdot b(n-i)$";
        }
        if (formulaAEl) {
            formulaAEl.textContent = "$" + coeffsToLatex(coeffsA, "a") + "$";
        }
        if (formulaBEl) {
            formulaBEl.textContent = "$" + coeffsToLatex(coeffsB, "b") + "$";
        }
        if (formulaGEl) {
            formulaGEl.textContent = "$" + coeffsToLatex(coeffsG, "g") + "$";
        }
        if (typeof (window as any).MathJax !== "undefined" && (window as any).MathJax.typesetPromise) {
            (window as any).MathJax.typesetPromise([formulaConvEl, formulaAEl, formulaBEl, formulaGEl].filter(Boolean)).catch(() => {});
        }

        const table = getElementById<HTMLTableElement>("lrc_table");
        const rows = Array.from({ length: nTerms }, (_, i) => i);
        const cols = ["a(n)", "b(n)", "g(n)"];
        draw_table(
            table,
            rows,
            cols,
            (row, col) => {
                const n = rows[row];
                const c = cols[col];
                if (c === "a(n)") {
                    return a[n];
                }
                if (c === "b(n)") {
                    return b[n];
                }
                return gDirect[n];
            },
            (n) => String(n),
            (c) => c,
            (x) => (typeof x === "bigint" ? x.toString() : String(x)),
            () => "#e8e8e8",
            () => "#f0f0f0",
            () => "#fff"
        );
    } catch (err) {
        statusEl.textContent = "Error: " + (err instanceof Error ? err.message : String(err));
        statusEl.style.color = "red";
    }
}

