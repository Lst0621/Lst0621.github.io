import { always } from "../tsl/ts/func";
import { array_eq_2d } from "../tsl/ts/math/math";
import { matrix_multiply_zn } from "../tsl/ts/math/matrix";
import {
    dihedral_to_str,
    get_permutation_parity,
    perm_to_str,
} from "../tsl/ts/math/group";
import { get_sub } from "../tsl/ts/util";
import { draw_multiplication_table, draw_table, matrix_to_cell } from "../tsl/ts/visual";
import { wasm_get_gl_n_zm } from "../tsl/wasm/ts/wasm_api_gl_matrix";
import {
    wasmDihedralTable,
    wasmModularTable,
    wasmPermutationGroupTable,
    WasmPermutationGroupMode,
} from "../tsl/wasm/ts/wasm_api_permutation";

type Mode = "zn" | "sn" | "an" | "dn" | "gl2";

interface ModeConfig {
    label: string;
    min: number;
    max: number;
}

const modes: Record<Mode, ModeConfig> = {
    zn: { label: "Z\u2099", min: 3, max: 16 },
    sn: { label: "S\u2099", min: 2, max: 5 },
    an: { label: "A\u2099", min: 2, max: 5 },
    dn: { label: "D\u2099", min: 3, max: 10 },
    gl2: { label: "GL(2,Z\u2099)", min: 2, max: 3 },
};

let currentMode: Mode = "zn";
let currentN = 7;

function clamp(n: number, mode: Mode): number {
    const cfg = modes[mode];
    return Math.max(cfg.min, Math.min(cfg.max, n));
}

function getTable(): HTMLTableElement {
    return document.getElementById("multiplication_table") as HTMLTableElement;
}

function getSecondTable(): HTMLTableElement {
    return document.getElementById("multiplication_table_secondary") as HTMLTableElement;
}

function setSummary(text: string): void {
    (document.getElementById("mul_text") as HTMLSpanElement).innerHTML = text;
}

function setStatus(text: string): void {
    (document.getElementById("mul_status") as HTMLSpanElement).innerHTML = text;
}

function updateControls(): void {
    const cfg = modes[currentMode];
    (document.getElementById("n_value") as HTMLSpanElement).textContent = currentN.toString();
    (document.getElementById("n_range") as HTMLSpanElement).textContent = `[${cfg.min}, ${cfg.max}]`;
    for (const mode of Object.keys(modes) as Mode[]) {
        const btn = document.getElementById(`mode_${mode}`) as HTMLButtonElement | null;
        if (btn) {
            btn.disabled = mode === currentMode;
        }
    }
}

function hideSecondTable(): void {
    const table = getSecondTable();
    table.style.display = "none";
    while (table.rows.length > 0) {
        table.deleteRow(0);
    }
}

function showSecondTable(): HTMLTableElement {
    const table = getSecondTable();
    table.style.display = "";
    return table;
}

function drawIndexedMultiplicationTable<T>(
    table: HTMLTableElement,
    elements: T[],
    productIndex: number[][],
    toString: (a: T) => string,
    inputColor: (a: T) => string,
    productColor: (a: T, b: T, c: T) => string,
): void {
    const indices = elements.map((_, i) => i);
    draw_table(
        table,
        indices,
        indices,
        (row, col) => productIndex[row][col],
        (i) => toString(elements[i]),
        (i) => toString(elements[i]),
        (i) => toString(elements[i]),
        (i) => inputColor(elements[i]),
        (i) => inputColor(elements[i]),
        (row, col) => {
            const product = elements[productIndex[row][col]];
            return productColor(elements[row], elements[col], product);
        },
    );
}

function renderZn(): void {
    hideSecondTable();
    const mod = currentN;
    const data = wasmModularTable(mod);
    setSummary(
        `Multiplication for Z${get_sub(mod.toString())}. ` +
            `|U${get_sub(mod.toString())}|=${data.totient} ` +
            `primitive roots: [${data.primitiveRoots}]`,
    );

    const inputs: number[] = [];
    for (let i = 1; i < mod; i++) {
        inputs.push(i);
    }

    const coPrimeColor = "#8A6BBE";
    const notCoPrimeColor = "#7B90D2";
    const identityColor = "#FC9F4D";
    const unitGroupColor = "#E87A90";
    const otherColor = "#FEDFE1";
    draw_table(
        getTable(),
        inputs,
        inputs,
        (i, j) => data.productValues[i][j],
        (a) => `[${a}]`,
        (a) => `[${a}]`,
        (a) => `[${a}]`,
        (a) => (data.unitFlags[a - 1] ? coPrimeColor : notCoPrimeColor),
        (a) => (data.unitFlags[a - 1] ? coPrimeColor : notCoPrimeColor),
        (i, j) => {
            const c = data.productValues[i][j];
            if (c === 1) {
                return identityColor;
            }
            return data.unitFlags[i] && data.unitFlags[j] ? unitGroupColor : otherColor;
        },
    );
    setStatus(`Units U${get_sub(mod.toString())} stay highlighted in red; non-units stay blue/pink.`);
}

function renderPermutation(mode: WasmPermutationGroupMode): void {
    hideSecondTable();
    const data = wasmPermutationGroupTable(mode, currentN);
    const elements = data.elements.map((image) => image.map((x) => x + 1));
    const groupName = mode === "sn" ? "S" : "A";
    setSummary(`Multiplication for ${groupName}${get_sub(currentN.toString())}; |${groupName}${get_sub(currentN.toString())}|=${data.count}`);
    drawIndexedMultiplicationTable(
        getTable(),
        elements,
        data.table,
        perm_to_str,
        (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"),
        (_a, _b, c) => (get_permutation_parity(c) ? "lightgreen" : "lightblue"),
    );
    setStatus("Green cells are even permutations.");
}

function renderDihedral(): void {
    setSummary(`Multiplication for D${get_sub(currentN.toString())}`);
    const data = wasmDihedralTable(currentN);
    drawIndexedMultiplicationTable(
        getTable(),
        data.elements,
        data.table,
        dihedral_to_str,
        always("lightblue"),
        always("lightyellow"),
    );

    const perms = data.permutationElements.map((image) => image.map((x) => x + 1));
    drawIndexedMultiplicationTable(
        showSecondTable(),
        perms,
        data.table,
        perm_to_str,
        (a) => (get_permutation_parity(a) ? "lightgreen" : "lightblue"),
        (_a, _b, c) => (get_permutation_parity(c) ? "lightgreen" : "lightblue"),
    );
    setStatus("The second table shows the same dihedral group through its permutation action.");
}

function flatGlToMatrices(flat: number[], count: number, modulus: number): number[][][] {
    const matrices: number[][][] = [];
    for (let k = 0; k < count; k++) {
        const offset = k * 4;
        matrices.push([
            [flat[offset] % modulus, flat[offset + 1] % modulus],
            [flat[offset + 2] % modulus, flat[offset + 3] % modulus],
        ]);
    }
    return matrices;
}

function renderGl2(): void {
    hideSecondTable();
    const modulus = currentN;
    setSummary(`Multiplication for GL(2,Z${get_sub(modulus.toString())})`);

    const handle = wasm_get_gl_n_zm(2, modulus);
    try {
        const matrices = flatGlToMatrices(handle.toFlatArray(), handle.count, modulus);
        draw_multiplication_table(
            getTable(),
            matrices,
            (a, b) => matrix_multiply_zn(a, b, modulus),
            matrix_to_cell,
            always("lightblue"),
            (_a, _b, c) => (array_eq_2d(c, [[1, 0], [0, 1]]) ? "lightgreen" : "lightblue"),
        );
        setStatus(`Identity products are green. |GL(2,Z${get_sub(modulus.toString())})|=${handle.count}`);
    } finally {
        handle.free();
    }
}

export function update_table(): void {
    currentN = clamp(currentN, currentMode);
    updateControls();
    if (currentMode === "zn") {
        renderZn();
    } else if (currentMode === "sn") {
        renderPermutation("sn");
    } else if (currentMode === "an") {
        renderPermutation("an");
    } else if (currentMode === "dn") {
        renderDihedral();
    } else {
        renderGl2();
    }
}

export function set_mode(mode: Mode): void {
    currentMode = mode;
    currentN = clamp(currentN, currentMode);
    update_table();
}

export function increment(): void {
    currentN = clamp(currentN + 1, currentMode);
    update_table();
}

export function decrement(): void {
    currentN = clamp(currentN - 1, currentMode);
    update_table();
}

function setup(): void {
    for (const mode of Object.keys(modes) as Mode[]) {
        const btn = document.getElementById(`mode_${mode}`) as HTMLButtonElement | null;
        if (btn) {
            btn.onclick = () => set_mode(mode);
            btn.textContent = modes[mode].label;
        }
    }
    update_table();
}

setup();
