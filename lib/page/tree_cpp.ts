import {
    FractalTree,
    fractalTreeClassicBranches,
    fractalTreeGenerateBranches,
    fractalTreeMaxLevel,
    fractalTreeQuadCount,
    modulePromise,
    type FractalTreeBranch,
    type FractalTreeGeometry,
} from "../tsl/wasm/ts/wasm_api_fractal_tree";

const CANVAS_ID = "ft-canvas";
const STATUS_ID = "ft-status";
const PRESET_ID = "ft-preset";
const BRANCHES_ID = "ft-branches";
const LEVEL_ID = "ft-level";
const BUDGET_ID = "ft-budget";
const ASPECT_ID = "ft-aspect";
const SPREAD_ID = "ft-spread";
const SHRINK_ID = "ft-shrink";
const ASYMMETRY_ID = "ft-asymmetry";
const SEED_ID = "ft-seed";
const BRANCH_ROWS_ID = "ft-branch-rows";
const SPEED_ID = "ft-speed";
const PLAY_ID = "ft-play";
const RESET_ID = "ft-reset";

const CANVAS_W = 800;
const CANVAS_H = 500;
const ROOT_X = CANVAS_W / 2;
const ROOT_Y = CANVAS_H - 100;
const TRUNK_DX = 0;
const TRUNK_DY = -60;

const MAX_BRANCHES = 8;
const MAX_BUDGET = 1_000_000;
const DEFAULT_BUDGET = 250_000;
const DEFAULT_LEVEL = 16;

// Branch 0 red and branch 1 black match the legacy page; the rest are the
// solarized accents.
const PALETTE = ["#dc322f", "#073642", "#268bd2", "#859900", "#b58900", "#6c71c4", "#2aa198", "#d33682"];

type Preset = "classic" | "symmetric" | "custom";

interface Controls {
    preset: Preset;
    branchCount: number;
    level: number;
    budget: number;
    aspectRatio: number;
    spreadDeg: number;
    shrink: number;
    asymmetry: number;
    seed: number;
    speedMs: number;
}

const DEFAULT_CONTROLS: Controls = {
    preset: "classic",
    branchCount: 2,
    level: DEFAULT_LEVEL,
    budget: DEFAULT_BUDGET,
    aspectRatio: 0.15,
    spreadDeg: 60,
    shrink: 0.8,
    asymmetry: 0,
    seed: 1,
    speedMs: 800,
};

let controls: Controls = { ...DEFAULT_CONTROLS };
let branches: FractalTreeBranch[] = [];
let tree: FractalTree | null = null;
let geometry: FractalTreeGeometry | null = null;
let buildMs = 0;

let drawnDepth = 0;
let playing = true;
let timer: ReturnType<typeof setTimeout> | null = null;

function getElement<T extends HTMLElement>(id: string, ctor: new () => T): T {
    const el = document.getElementById(id);
    if (!el || !(el instanceof ctor)) {
        throw new Error(`Element #${id} not found`);
    }
    return el;
}

function getInput(id: string): HTMLInputElement {
    return getElement(id, HTMLInputElement);
}

function setStatus(text: string): void {
    const el = document.getElementById(STATUS_ID);
    if (el) {
        el.textContent = text;
    }
}

function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.max(min, Math.min(max, Math.trunc(value)));
}

function clampNumber(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.max(min, Math.min(max, value));
}

function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
}

function readControls(): void {
    const presetValue = getElement(PRESET_ID, HTMLSelectElement).value;
    controls.preset = presetValue === "symmetric" || presetValue === "custom" ? presetValue : "classic";
    controls.branchCount = clampInt(Number(getInput(BRANCHES_ID).value), 1, MAX_BRANCHES);
    controls.level = clampInt(Number(getInput(LEVEL_ID).value), 1, 64);
    controls.budget = clampInt(Number(getInput(BUDGET_ID).value), 1, MAX_BUDGET);
    controls.aspectRatio = clampNumber(Number(getInput(ASPECT_ID).value), 0, 1);
    controls.spreadDeg = clampNumber(Number(getInput(SPREAD_ID).value), 0, 360);
    controls.shrink = clampNumber(Number(getInput(SHRINK_ID).value), 0.2, 0.98);
    controls.asymmetry = clampNumber(Number(getInput(ASYMMETRY_ID).value), 0, 1);
    controls.seed = clampInt(Number(getInput(SEED_ID).value), 0, 4294967295);
    controls.speedMs = clampInt(Number(getInput(SPEED_ID).value), 50, 5000);
}

function writeControls(): void {
    getElement(PRESET_ID, HTMLSelectElement).value = controls.preset;
    getInput(BRANCHES_ID).value = String(controls.branchCount);
    getInput(LEVEL_ID).value = String(controls.level);
    getInput(BUDGET_ID).value = String(controls.budget);
    getInput(ASPECT_ID).value = String(controls.aspectRatio);
    getInput(SPREAD_ID).value = String(controls.spreadDeg);
    getInput(SHRINK_ID).value = String(controls.shrink);
    getInput(ASYMMETRY_ID).value = String(controls.asymmetry);
    getInput(SEED_ID).value = String(controls.seed);
    getInput(SPEED_ID).value = String(controls.speedMs);

    const generatorEnabled = controls.preset === "symmetric";
    for (const row of document.querySelectorAll<HTMLElement>(".ft-generator")) {
        row.classList.toggle("ft-disabled", !generatorEnabled);
        for (const input of row.querySelectorAll<HTMLInputElement>("input")) {
            input.disabled = !generatorEnabled;
        }
    }
    getInput(BRANCHES_ID).disabled = controls.preset === "classic";
}

function generatedBranches(count: number): FractalTreeBranch[] {
    return fractalTreeGenerateBranches(
        count,
        degToRad(controls.spreadDeg),
        controls.shrink,
        controls.asymmetry,
        controls.seed,
    );
}

/** Recomputes `branches` from the preset; in custom mode only resizes the table. */
function syncBranches(): void {
    if (controls.preset === "classic") {
        branches = fractalTreeClassicBranches();
        controls.branchCount = branches.length;
        return;
    }
    if (controls.preset === "symmetric") {
        branches = generatedBranches(controls.branchCount);
        return;
    }
    if (branches.length === 0) {
        branches = generatedBranches(controls.branchCount);
        return;
    }
    if (branches.length > controls.branchCount) {
        branches = branches.slice(0, controls.branchCount);
    } else if (branches.length < controls.branchCount) {
        const fill = generatedBranches(controls.branchCount);
        branches = branches.concat(fill.slice(branches.length));
    }
}

function renderBranchTable(): void {
    const tbody = getElement(BRANCH_ROWS_ID, HTMLTableSectionElement);
    tbody.replaceChildren();
    branches.forEach((b, i) => {
        const tr = document.createElement("tr");

        const swatchCell = document.createElement("td");
        const swatch = document.createElement("span");
        swatch.className = "ft-swatch";
        swatch.style.background = PALETTE[i % PALETTE.length];
        swatchCell.appendChild(swatch);

        const indexCell = document.createElement("td");
        indexCell.textContent = String(i);

        const angleCell = document.createElement("td");
        const angle = document.createElement("input");
        angle.type = "number";
        angle.step = "0.5";
        angle.min = "-180";
        angle.max = "180";
        angle.value = radToDeg(b.angleRad).toFixed(2);
        angle.addEventListener("change", () => {
            onBranchEdited(i, { angleRad: degToRad(clampNumber(Number(angle.value), -180, 180)) });
        });
        angleCell.appendChild(angle);

        const scaleCell = document.createElement("td");
        const scale = document.createElement("input");
        scale.type = "number";
        scale.step = "0.01";
        scale.min = "0.05";
        scale.max = "1.5";
        scale.value = b.scale.toFixed(3);
        scale.addEventListener("change", () => {
            onBranchEdited(i, { scale: clampNumber(Number(scale.value), 0.05, 1.5) });
        });
        scaleCell.appendChild(scale);

        tr.append(swatchCell, indexCell, angleCell, scaleCell);
        tbody.appendChild(tr);
    });
}

function onBranchEdited(index: number, patch: Partial<FractalTreeBranch>): void {
    if (index < 0 || index >= branches.length) {
        return;
    }
    branches[index] = { ...branches[index], ...patch };
    controls.preset = "custom";
    getElement(PRESET_ID, HTMLSelectElement).value = "custom";
    rebuild();
}

/** Clamps the level control to the largest level that fits the budget. */
function clampLevel(): number {
    const maxLevel = Math.max(1, fractalTreeMaxLevel(controls.branchCount, controls.budget));
    controls.level = clampInt(controls.level, 1, maxLevel);
    const levelInput = getInput(LEVEL_ID);
    levelInput.max = String(maxLevel);
    levelInput.value = String(controls.level);
    return maxLevel;
}

function stopAnimation(): void {
    if (timer !== null) {
        clearTimeout(timer);
        timer = null;
    }
}

function getContext(): CanvasRenderingContext2D {
    const ctx = getElement(CANVAS_ID, HTMLCanvasElement).getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get 2D canvas context.");
    }
    return ctx;
}

function clearCanvas(): void {
    getContext().clearRect(0, 0, CANVAS_W, CANVAS_H);
}

// Canvas fill time grows superlinearly with the number of subpaths (100k
// quads: one fill ~18 s, 64-quad batches ~18 ms in Chrome), so quads are
// flushed in small batches.
const FILL_BATCH_QUADS = 64;

/** Draws the quads of one depth layer, grouped by branch colour in small batches. */
function drawDepth(depth: number): void {
    if (!geometry || depth < 0 || depth >= geometry.depthCount) {
        return;
    }
    const ctx = getContext();
    const { quadXY, branchIndex, depthOffsets } = geometry;
    const start = depthOffsets[depth];
    const end = depthOffsets[depth + 1];
    const colourCount = Math.min(branches.length, PALETTE.length);
    for (let colour = 0; colour < colourCount; colour++) {
        ctx.fillStyle = PALETTE[colour];
        let pending = 0;
        ctx.beginPath();
        for (let q = start; q < end; q++) {
            if (branchIndex[q] % PALETTE.length !== colour) {
                continue;
            }
            const o = q * 8;
            ctx.moveTo(quadXY[o], quadXY[o + 1]);
            ctx.lineTo(quadXY[o + 2], quadXY[o + 3]);
            ctx.lineTo(quadXY[o + 4], quadXY[o + 5]);
            ctx.lineTo(quadXY[o + 6], quadXY[o + 7]);
            ctx.closePath();
            pending += 1;
            if (pending === FILL_BATCH_QUADS) {
                ctx.fill();
                ctx.beginPath();
                pending = 0;
            }
        }
        if (pending > 0) {
            ctx.fill();
        }
    }
}

function drawUpTo(depth: number): void {
    clearCanvas();
    for (let d = 0; d < depth; d++) {
        drawDepth(d);
    }
    drawnDepth = depth;
}

function updateStatus(maxLevel: number): void {
    if (!geometry) {
        return;
    }
    const total = fractalTreeQuadCount(controls.branchCount, controls.level);
    setStatus(
        `quads ${total.toLocaleString()} (budget ${controls.budget.toLocaleString()}, max level ${maxLevel})\n` +
            `build ${buildMs.toFixed(2)} ms · showing depth ${drawnDepth}/${geometry.depthCount}`,
    );
}

function animationTick(): void {
    timer = null;
    if (!playing || !geometry) {
        return;
    }
    if (drawnDepth >= geometry.depthCount) {
        // Hold the full tree for one tick, then restart from the trunk.
        drawUpTo(0);
    } else {
        drawDepth(drawnDepth);
        drawnDepth += 1;
    }
    updateStatus(Number(getInput(LEVEL_ID).max));
    timer = setTimeout(animationTick, controls.speedMs);
}

function startAnimation(): void {
    stopAnimation();
    if (playing) {
        timer = setTimeout(animationTick, controls.speedMs);
    }
}

function rebuild(): void {
    if (!tree) {
        return;
    }
    readControls();
    syncBranches();
    writeControls();
    renderBranchTable();
    const maxLevel = clampLevel();

    const t0 = performance.now();
    try {
        geometry = tree.build(
            {
                rootX: ROOT_X,
                rootY: ROOT_Y,
                trunkDx: TRUNK_DX,
                trunkDy: TRUNK_DY,
                aspectRatio: controls.aspectRatio,
                maxLevel: controls.level,
                branches,
            },
            controls.budget,
        );
    } catch (err) {
        geometry = null;
        stopAnimation();
        clearCanvas();
        setStatus(err instanceof Error ? err.message : String(err));
        return;
    }
    buildMs = performance.now() - t0;

    // Start with the trunk visible; the animation grows one depth per tick.
    drawUpTo(playing ? 1 : geometry.depthCount);
    updateStatus(maxLevel);
    startAnimation();
}

function togglePlay(): void {
    playing = !playing;
    getElement(PLAY_ID, HTMLButtonElement).textContent = playing ? "Pause" : "Play";
    if (playing) {
        startAnimation();
    } else {
        stopAnimation();
        if (geometry) {
            drawUpTo(geometry.depthCount);
            updateStatus(Number(getInput(LEVEL_ID).max));
        }
    }
}

function resetAll(): void {
    controls = { ...DEFAULT_CONTROLS };
    branches = [];
    writeControls();
    rebuild();
}

function bindControls(): void {
    getElement(PRESET_ID, HTMLSelectElement).addEventListener("change", () => {
        readControls();
        if (controls.preset === "custom" && branches.length === 0) {
            branches = generatedBranches(controls.branchCount);
        }
        rebuild();
    });
    for (const id of [BRANCHES_ID, LEVEL_ID, BUDGET_ID, ASPECT_ID, SPREAD_ID, SHRINK_ID, ASYMMETRY_ID, SEED_ID]) {
        getInput(id).addEventListener("change", rebuild);
    }
    getInput(SPEED_ID).addEventListener("change", () => {
        readControls();
        startAnimation();
    });
    getElement(PLAY_ID, HTMLButtonElement).addEventListener("click", togglePlay);
    getElement(RESET_ID, HTMLButtonElement).addEventListener("click", resetAll);
}

async function main(): Promise<void> {
    setStatus("loading");
    await modulePromise;
    tree = new FractalTree();
    bindControls();
    resetAll();
}

main().catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err));
});
