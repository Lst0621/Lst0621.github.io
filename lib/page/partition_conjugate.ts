import { wasm_conjugate_partition } from "../tsl/wasm/ts/wasm_api_number_of_sequences";

type Maybe<T> = T | null;

function $(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`Missing element: ${id}`);
    }
    return el;
}

function randomIntInclusive(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomPartition10(): number[] {
    // 10 integers, each < 10, non-negative, and sorted non-increasing.
    const parts = Array.from({ length: 10 }, () => randomIntInclusive(1, 9));
    parts.sort((a, b) => b - a);
    return parts;
}

function formatArray(a: readonly number[]): string {
    return `[${a.join(", ")}]`;
}

function formatTupleLatex(a: readonly number[]): string {
    // Use parentheses, standard partition notation.
    return `\\left(${a.join(", ")}\\right)`;
}

function typesetMath(container: HTMLElement): void {
    const mj = (window as any).MathJax;
    if (mj?.typesetPromise) {
        void mj.typesetPromise([container]);
    }
}

function drawBars(lambda: readonly number[], lambdaConj: readonly number[]): void {
    const canvas = $("bars_canvas") as HTMLCanvasElement;

    // Layout
    const pad = 18;
    const gapGroups = 40;
    const cell = 18;
    const baselineH = 10;

    const wA = (lambda[0] ?? 0) * cell;
    const wB = wA;
    const wC = (lambdaConj[0] ?? 0) * cell;
    const wD = wC;

    const neededW = pad + wA + gapGroups + wB + gapGroups + wC + gapGroups + wD + pad;
    const maxHeightCells = Math.max(
        lambda.length,
        lambdaConj.length,
        lambdaConj[0] ?? 0,
        lambda[0] ?? 0,
    );
    const neededH = pad + baselineH + maxHeightCells * cell + pad + 26;

    if (canvas.width !== neededW) {
        canvas.width = neededW;
    }
    if (canvas.height !== neededH) {
        canvas.height = neededH;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Canvas 2D context not available");
    }

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const baseY = pad + baselineH + maxHeightCells * cell;

    ctx.fillStyle = "#073642";
    ctx.strokeStyle = "#073642";

    function drawRowsGroup(leftX: number, rows: readonly number[], fill1: string, fill2: string): void {
        const maxLen = rows.length > 0 ? rows[0] : 0;
        ctx.fillStyle = "#073642";
        ctx.fillRect(leftX, baseY - baselineH, maxLen * cell, baselineH);

        for (let i = 0; i < rows.length; i++) {
            const len = rows[i];
            if (len <= 0) {
                continue;
            }
            const x = leftX;
            const y = baseY - baselineH - (i + 1) * cell;
            const w = len * cell;
            ctx.fillStyle = i % 2 === 0 ? fill1 : fill2;
            ctx.fillRect(x, y, w, cell);
            ctx.strokeRect(x, y, w, cell);

            // Length label at the right most of the bar.
            ctx.fillStyle = "#073642";
            ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
            ctx.textBaseline = "middle";
            ctx.textAlign = "right";
            const label = String(len);
            ctx.fillText(label, x + w - 4, y + cell / 2);
            ctx.textAlign = "left"; // reset
        }
    }

    function drawColsGroup(leftX: number, stripeCount: number, heights: readonly number[], fill1: string, fill2: string): void {
        ctx.fillStyle = "#073642";
        ctx.fillRect(leftX, baseY - baselineH, stripeCount * cell, baselineH);

        for (let j = 0; j < stripeCount; j++) {
            const hCells = j < heights.length ? heights[j] : 0;
            if (hCells <= 0) {
                continue;
            }
            const x = leftX + j * cell;
            const y = baseY - baselineH - hCells * cell;
            const h = hCells * cell;
            ctx.fillStyle = j % 2 === 0 ? fill1 : fill2;
            ctx.fillRect(x, y, cell, h);
            ctx.strokeRect(x, y, cell, h);

            // Height label near top of stripe.
            ctx.fillStyle = "#073642";
            ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
            ctx.textBaseline = "top";
            const label = String(hCells);
            ctx.fillText(label, x + 4, y + 2);
        }
    }

    // A, B, C, D in one row.
    const xA = pad;
    const xB = xA + wA + gapGroups;
    const xC = xB + wB + gapGroups;
    const xD = xC + wC + gapGroups;

    // A: λ rows
    drawRowsGroup(xA, lambda, "#9ecae1", "#c6dbef");
    // B: λ' cols
    drawColsGroup(xB, lambda[0] ?? 0, lambdaConj, "#a1d99b", "#c7e9c0");
    // C: λ' rows
    drawRowsGroup(xC, lambdaConj, "#dadaeb", "#efedf5");
    // D: (λ')' = λ cols
    drawColsGroup(xD, lambdaConj[0] ?? 0, lambda, "#fdd0a2", "#fee6ce");
}

function setText(id: string, text: string): void {
    $(id).textContent = text;
}

async function computeAndRender(partition: number[]): Promise<void> {
    const status = $("status") as Maybe<HTMLParagraphElement>;

    try {
        if (status) {
            status.textContent = "Computing...";
            status.style.color = "blue";
        }

        // The WASM side requires sorted non-increasing and non-negative.
        const lambda = partition;
        const lambdaConj = wasm_conjugate_partition(lambda);

        const io = $("io_math");
        io.innerHTML =
            `$\\lambda = ${formatTupleLatex(lambda)}$<br>` +
            `$\\lambda' = ${formatTupleLatex(lambdaConj)}$`;
        typesetMath(io);

        drawBars(lambda, lambdaConj);

        if (status) {
            status.textContent = "\u2713";
            status.style.color = "green";
        }
    } catch (err: any) {
        if (status) {
            status.textContent = `Error: ${err?.message ?? err}`;
            status.style.color = "red";
        }
        throw err;
    }
}

export async function generateNew(): Promise<void> {
    const lambda = generateRandomPartition10();
    await computeAndRender(lambda);
}

export async function initPartitionConjugatePage(): Promise<void> {
    // Wire button if present.
    const btn = document.getElementById("generate_btn") as Maybe<HTMLButtonElement>;
    if (btn) {
        btn.addEventListener("click", () => {
            void generateNew();
        });
    }

    await generateNew();
}
