import {
    modulePromise,
    wasmGraphRandomTree,
    wasmGraphAddLeafWithLayout,
    wasmGraphRemoveLeafWithLayout,
    wasmGraphTreeLayoutRadial,
    wasmGraphTreeMetricDimension,
    wasmGraphTreePruferEncode,
    wasmGraphTreePruferDecode,
} from "../tsl/wasm/ts/wasm_api_graph_demo";
import {
    edgeListFromAdj01Based,
    isFiniteInt,
    parseEdgeListJson,
    writeClipboardText,
    type EdgeList,
} from "../common/graph_io";
// Animation helper (moved from visual_radial.ts into page scope)

type Position = { x: number[]; y: number[] };

export function animatePositions(oldPos: Position | null, newPos: Position, duration = 400, onFrame?: (pos: Position) => void) {
    const n = newPos.x.length;
    const fromX = (oldPos && oldPos.x.length === n) ? oldPos.x : new Array(n).fill(newPos.x[0] || 0);
    const fromY = (oldPos && oldPos.y.length === n) ? oldPos.y : new Array(n).fill(newPos.y[0] || 0);
    const start = performance.now();
    return new Promise<void>((resolve) => {
        function step(t: number) {
            const p = Math.min(1, (t - start) / duration);
            const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p; // easeInOutQuad-like
            const curX = new Array(n);
            const curY = new Array(n);
            for (let i = 0; i < n; i++) {
                curX[i] = fromX[i] + (newPos.x[i] - fromX[i]) * ease;
                curY[i] = fromY[i] + (newPos.y[i] - fromY[i]) * ease;
            }
            if (onFrame) onFrame({ x: curX, y: curY });
            if (p < 1) requestAnimationFrame(step);
            else resolve();
        }
        requestAnimationFrame(step);
    });
}

// playFrames removed — we use TS animation to interpolate start -> finish

const CANVAS_W = 800;
const CANVAS_H = 520;
const NODE_R = 18;
const MAX_N = 200;
const MIN_N = 2;
const SIM_ANIM_MS = 700;
const EDGE_SCALE = 1.5;
const POLYNOMIAL_FOLD_TERM_COUNT = 9;
const POLYNOMIAL_TERMS_PER_LINE = 4;

/** Full relayout: radial, every node position recomputed from the tree shape. */
function runTreeLayout(adj01_in: number[], nv: number): Position {
    return wasmGraphTreeLayoutRadial(adj01_in, nv, CANVAS_W, CANVAS_H);
}

let n = 10;
let seed = (Math.random() * 0xffffffff) >>> 0;
let adj01: number[] = [];
let positions: Position | null = null;
let nodeTypes: { isExteriorMajor: boolean[]; isLeaf: boolean[]; basis: number[]; dimension: number } | null = null;
type ModeStats = {
    pdim: { node: string; edge: string; mixed: string } | null;
    polynomial: { node: ModePolynomialResult; edge: ModePolynomialResult; mixed: ModePolynomialResult } | null;
    loading: boolean;
    error: string;
};
type ModePolynomialResult = {
    coeffs: number[];
    html: string;
};
let modeStats: ModeStats = { pdim: null, polynomial: null, loading: false, error: "" };
let statsWorker: Worker | null = null;
let statsToken = 0;
let simToken = 0;
let pruferIoText = "";
let pruferIoStatus = "";
let pruferIoStatusIsError = false;
let edgeIoText = "";
let edgeIoStatus = "";
let edgeIoStatusIsError = false;

// ── Pure helpers (no graph logic) ──────────────────────────────────

function updateBannerVisibility() {
    const banner = document.getElementById("limit-banner")!;
    banner.style.display = n >= MAX_N ? "block" : "none";
}

function adj01ToAdjList(flat: number[], nv: number): number[][] {
    const adj: number[][] = Array.from({ length: nv }, () => []);
    for (let i = 0; i < nv; i++)
        for (let j = i + 1; j < nv; j++)
            if (flat[i * nv + j] !== 0) { adj[i].push(j); adj[j].push(i); }
    return adj;
}

function parsePruferJson(raw: string): { code0: number[]; base: 0 | 1; n: number } {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return { code0: [], base: 1, n: 2 };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(trimmed);
    } catch (e) {
        throw new Error(`Invalid JSON: ${(e as Error).message}`);
    }
    if (!Array.isArray(parsed)) {
        throw new Error("Expected a JSON array, e.g. [2,2,4].");
    }

    const codeRaw: number[] = [];
    let sawZero = false;
    let minVal = Number.POSITIVE_INFINITY;
    for (let i = 0; i < parsed.length; i++) {
        const v = (parsed as unknown[])[i];
        if (!isFiniteInt(v)) {
            throw new Error(`Entry #${i + 1} must be an integer, got ${JSON.stringify(v)}.`);
        }
        if (v === 0) sawZero = true;
        minVal = Math.min(minVal, v);
        codeRaw.push(v);
    }

    const nFromCode = codeRaw.length + 2;
    const base: 0 | 1 = sawZero ? 0 : (minVal >= 1 ? 1 : 0);
    const code0 = codeRaw.map((v) => (base === 1 ? v - 1 : v));
    for (let i = 0; i < code0.length; i++) {
        const v = code0[i];
        if (v < 0 || v >= nFromCode) {
            throw new Error(`Entry #${i + 1} is out of range after base=${base} conversion: ${codeRaw[i]}.`);
        }
    }
    return { code0, base, n: nFromCode };
}

function updatePruferStatusUI(): void {
    const statusEl = document.getElementById("prufer-status") as HTMLSpanElement | null;
    if (!statusEl) return;
    statusEl.textContent = pruferIoStatus;
    statusEl.style.color = pruferIoStatusIsError ? "#dc322f" : "#586e75";
}

function updateEdgeStatusUI(): void {
    const statusEl = document.getElementById("edge-status") as HTMLSpanElement | null;
    if (!statusEl) return;
    statusEl.textContent = edgeIoStatus;
    statusEl.style.color = edgeIoStatusIsError ? "#dc322f" : "#586e75";
}

function formatRationalDisplay(raw: string | undefined | null): string {
    const s = String(raw ?? "").trim();
    if (!s.includes("/")) return s;
    const parts = s.split("/");
    if (parts.length !== 2) return s;
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (den === 0 || Number.isNaN(num) || Number.isNaN(den)) return s;
    if (num % den === 0) return String(num / den);
    return `$\\frac{${num}}{${den}}$ (${(num / den).toFixed(2)})`;
}

function resolvingPolynomialTerms(coeffs: readonly number[]): string[] {
    const terms: string[] = [];
    for (let k = 0; k < coeffs.length; k++) {
        const c = coeffs[k] ?? 0;
        if (c === 0) continue;
        if (k === 0) {
            terms.push(String(c));
        } else if (k === 1) {
            terms.push(c === 1 ? "x" : `${c}x`);
        } else {
            terms.push(c === 1 ? `x^{${k}}` : `${c}x^{${k}}`);
        }
    }
    return terms.length > 0 ? terms : ["0"];
}

function formatResolvingPolynomial(coeffs: readonly number[]): string {
    const terms = resolvingPolynomialTerms(coeffs);
    if (terms.length <= POLYNOMIAL_FOLD_TERM_COUNT) {
        return `$${terms.join(" + ")}$`;
    }
    const previewTerms = [
        ...terms.slice(0, 4),
        "\\cdots",
        ...terms.slice(-3),
    ];
    const preview = `$${previewTerms.join(" + ")}$`;
    const lines: string[] = [];
    for (let i = 0; i < terms.length; i += POLYNOMIAL_TERMS_PER_LINE) {
        const chunk = terms.slice(i, i + POLYNOMIAL_TERMS_PER_LINE).join(" + ");
        const suffix = i + POLYNOMIAL_TERMS_PER_LINE < terms.length ? " +" : "";
        lines.push(
            `<div style="max-width:100%; overflow-wrap:anywhere;">$${chunk}${suffix}$</div>`,
        );
    }
    return (
        `<details style="display:inline-block; vertical-align:top; max-width:100%;">` +
        `<summary style="cursor:pointer;">${preview}</summary>` +
        `<div style="margin-top:4px; max-width:100%;">${lines.join("")}</div>` +
        `</details>`
    );
}

function makeModePolynomialResult(coeffs: readonly number[]): ModePolynomialResult {
    const coeffList = Array.from(coeffs, (v) => Number(v));
    return {
        coeffs: coeffList,
        html: formatResolvingPolynomial(coeffList),
    };
}

function resetModeStats(): void {
    modeStats = { pdim: null, polynomial: null, loading: false, error: "" };
    if (statsWorker) {
        try { statsWorker.terminate(); } catch {}
        statsWorker = null;
    }
    statsToken++;
}

function startModeStatsWorker(): void {
    const token = ++statsToken;
    if (statsWorker) {
        try { statsWorker.terminate(); } catch {}
        statsWorker = null;
    }
    modeStats = { pdim: null, polynomial: null, loading: true, error: "" };
    updateInfo();

    const worker = new Worker("/assets/js/page/tree_stats_worker.js", { type: "module" });
    statsWorker = worker;
    worker.onmessage = (ev) => {
        const d = ev.data as any;
        if (d.token !== token) {
            return;
        }
        if (d.error) {
            modeStats = { pdim: null, polynomial: null, loading: false, error: String(d.error) };
        } else {
            modeStats = {
                pdim: d.pdim,
                polynomial: {
                    node: makeModePolynomialResult(d.polynomial.node ?? []),
                    edge: makeModePolynomialResult(d.polynomial.edge ?? []),
                    mixed: makeModePolynomialResult(d.polynomial.mixed ?? []),
                },
                loading: false,
                error: "",
            };
        }
        if (statsWorker === worker) {
            statsWorker = null;
        }
        try { worker.terminate(); } catch {}
        updateInfo();
    };
    worker.onerror = (ev) => {
        if (statsToken !== token) {
            return;
        }
        modeStats = {
            pdim: null,
            polynomial: null,
            loading: false,
            error: ev.message || "tree stats worker failed",
        };
        if (statsWorker === worker) {
            statsWorker = null;
        }
        try { worker.terminate(); } catch {}
        updateInfo();
    };
    worker.postMessage({ cmd: "start", token, adj01, n });
}

function syncPruferIoFromGraph(): void {
    try {
        const code0 = wasmGraphTreePruferEncode(adj01, n);
        const code1 = code0.map((v) => v + 1);
        pruferIoText = JSON.stringify(code1);
    } catch {
        pruferIoText = "";
    }
    const ta = document.getElementById("prufer-input") as HTMLTextAreaElement | null;
    if (ta) {
        ta.value = pruferIoText;
    }
}

function syncEdgeIoFromGraph(): void {
    edgeIoText = JSON.stringify(edgeListFromAdj01Based(adj01, n));
    const ta = document.getElementById("edge-input") as HTMLTextAreaElement | null;
    if (ta) {
        ta.value = edgeIoText;
    }
}

function syncIoFromGraph(): void {
    syncPruferIoFromGraph();
    syncEdgeIoFromGraph();
}

/** Same rule as right-click remove: degree 1, and not the center vertex when n > 2. */
function isRemovableLeaf(v: number, adj: number[][], nv: number): boolean {
    return adj[v].length <= 1 && !(v === 0 && nv > 2);
}

function findRemovableLeaf(adj: number[][]): number {
    for (let v = adj.length - 1; v >= 0; v--)
        if (isRemovableLeaf(v, adj, adj.length)) return v;
    return -1;
}

function logState(pos: { x: number[]; y: number[] }) {
    const adj = adj01ToAdjList(adj01, n);
    console.group("Tree state");
    console.log("Nodes:");
    for (let v = 0; v < pos.x.length; v++) {
        const type = nodeTypes
            ? (nodeTypes.basis.includes(v) ? "basis" : nodeTypes.isExteriorMajor[v] ? "ext-major" : "—")
            : "?";
        console.log(`  ${v}: (${pos.x[v].toFixed(1)}, ${pos.y[v].toFixed(1)}) ${type}`);
    }
    const edges: string[] = [];
    for (let u = 0; u < adj.length; u++)
        for (const v of adj[u]) if (u < v) edges.push(`${u}-${v}`);
    console.log("Edges:", `{${edges.join(", ")}}`);
    console.groupEnd();
}

function draw(ctx: CanvasRenderingContext2D, pos: { x: number[]; y: number[] },
             adj: number[][], types: typeof nodeTypes) {
    const nv = adj.length;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = "#93a1a1"; ctx.lineWidth = 2; ctx.beginPath();
    for (let u = 0; u < nv; u++)
        for (const v of adj[u]) if (u < v) { ctx.moveTo(pos.x[u], pos.y[u]); ctx.lineTo(pos.x[v], pos.y[v]); }
    ctx.stroke();
    for (let v = 0; v < nv; v++) {
        const isBasis = types ? types.basis.includes(v) : false;
        const isExtMajor = types ? types.isExteriorMajor[v] : false;
        ctx.beginPath(); ctx.arc(pos.x[v], pos.y[v], isExtMajor ? NODE_R + 4 : NODE_R, 0, Math.PI * 2);
        if (isBasis) { ctx.fillStyle = "#eee8d5"; ctx.strokeStyle = "#b58900"; ctx.lineWidth = 3; }
        else if (isExtMajor) { ctx.fillStyle = "#fdf6e3"; ctx.strokeStyle = "#dc322f"; ctx.lineWidth = 3; }
        else { ctx.fillStyle = "#fdf6e3"; ctx.strokeStyle = "#268bd2"; ctx.lineWidth = 2; }
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#073642"; ctx.font = "13px ui-monospace, Courier, monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(v), pos.x[v], pos.y[v]);
    }
    // Legend
    const lx = CANVAS_W - 200, ly = 15;
    ctx.font = "11px ui-monospace, Courier, monospace"; ctx.textAlign = "left";
    for (const [i, [c, l]] of [["#b58900", "basis"], ["#dc322f", "ext-major"]].entries()) {
        ctx.fillStyle = c; ctx.fillRect(lx, ly + i * 16 - 4, 10, 10);
        ctx.fillStyle = "#586e75"; ctx.fillText(l, lx + 14, ly + i * 16 + 1);
    }
}

function hitNode(mx: number, my: number, pos: { x: number[]; y: number[] }): number {
    for (let v = 0; v < pos.x.length; v++) {
        if ((mx - pos.x[v]) ** 2 + (my - pos.y[v]) ** 2 <= (NODE_R * 2) ** 2) return v;
    }
    return -1;
}

function updateInfo() {
    const infoEl = document.getElementById("info-area")!;
    if (!nodeTypes) {
        infoEl.innerHTML = "Metric dimension: ...<br>Basis: ...";
        return;
    }
    const lc = nodeTypes.isLeaf.filter(Boolean).length;
    const mc = nodeTypes.isExteriorMajor.filter(Boolean).length;
    const basis = nodeTypes.basis.length > 0 ? "{" + nodeTypes.basis.join(", ") + "}" : "{}";
    let statsHtml = "";
    if (modeStats.loading) {
        statsHtml = `<br><br><span style="color:var(--muted);">pdim / resolving polynomial: computing...</span>`;
    } else if (modeStats.error) {
        statsHtml = `<br><span style="color:#dc322f;">pdim / resolving polynomial: ${modeStats.error}</span>`;
    } else if (modeStats.pdim && modeStats.polynomial) {
        statsHtml =
            `<br><br>` +
            `pdim node: ${formatRationalDisplay(modeStats.pdim.node)}<br>` +
            `pdim edge: ${formatRationalDisplay(modeStats.pdim.edge)}<br>` +
            `pdim mixed: ${formatRationalDisplay(modeStats.pdim.mixed)}<br>` +
            `<br>` +
            `<div style="overflow-wrap:anywhere;">Resolving polynomial node: ${modeStats.polynomial.node.html}</div>` +
            `<div style="overflow-wrap:anywhere;">Resolving polynomial edge: ${modeStats.polynomial.edge.html}</div>` +
            `<div style="overflow-wrap:anywhere;">Resolving polynomial mixed: ${modeStats.polynomial.mixed.html}</div>`;
    }
    infoEl.innerHTML =
        `Metric dimension: ${nodeTypes.dimension}<br>` +
        `<span style="color:var(--muted);">(${lc} leaves - ${mc} ext-major = ${nodeTypes.dimension})</span><br>` +
        `Basis: ${basis}` +
        statsHtml;
    if ((window as any).MathJax?.typesetPromise) {
        (window as any).MathJax.typesetPromise([infoEl]).catch(() => {});
    }
}
function updateSizeLabel() { document.getElementById("size-label")!.textContent = "n=" + n; }
function setupCanvas(c: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    c.width = CANVAS_W * dpr; c.height = CANVAS_H * dpr;
    c.style.width = CANVAS_W + "px"; c.style.height = CANVAS_H + "px";
    c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render() {
    if (!positions) return;
    const canvas = document.getElementById("tree-canvas") as HTMLCanvasElement;
    setupCanvas(canvas);
    draw(canvas.getContext("2d")!, positions, adj01ToAdjList(adj01, n), nodeTypes);
    updateInfo(); updateSizeLabel(); updateRemoveHalfButton();
    (document.getElementById("seed-input") as HTMLInputElement).value = String(seed);
    updateBannerVisibility();
    updatePruferStatusUI();
    updateEdgeStatusUI();
}

// ── Operations (all graph logic in C++/WASM) ───────────────────────

async function regenerate() {
    nodeTypes = null; positions = null; resetModeStats(); updateInfo();
    await modulePromise;
    const r = wasmGraphRandomTree(n, seed);
    adj01 = r.adj01;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    startModeStatsWorker();
    const simId = ++simToken;
    const newPos = runTreeLayout(adj01, n);
    const from = positions;
    positions = newPos;
    render();
    await animatePositions(from, newPos, SIM_ANIM_MS, (pos) => { positions = pos; render(); });
    if (simId !== simToken) return;
    positions = newPos;
    syncIoFromGraph();
    logState(positions); render();
}

async function addLeafTo(parent: number) {
    if (!positions) return;
    const simId = ++simToken;
    const angle = Math.random() * Math.PI * 2.0;
    const dist = 55.0 * (0.8 + Math.random() * 0.4);
    const animFrom: Position = {
        x: [...positions.x, positions.x[parent] + Math.cos(angle) * dist],
        y: [...positions.y, positions.y[parent] + Math.sin(angle) * dist],
    };
    const r = wasmGraphAddLeafWithLayout(
        adj01, n, parent, positions.x, positions.y,
        CANVAS_W, CANVAS_H, seed, EDGE_SCALE,
    );
    adj01 = r.adj01;
    n = r.n;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    startModeStatsWorker();
    const newPos: Position = { x: r.x, y: r.y };
    positions = animFrom;
    render();
    await animatePositions(animFrom, newPos, SIM_ANIM_MS, (pos) => { positions = pos; render(); });
    if (simId !== simToken) return;
    positions = newPos;
    updateSizeLabel();
    updateRemoveHalfButton();
    syncIoFromGraph();
    logState(positions); render();
}

async function removeLeaf(leaf: number) {
    if (n <= MIN_N || !positions) return;
    const simId = ++simToken;
    const animFrom: Position = { x: positions.x.slice(), y: positions.y.slice() };
    const r = wasmGraphRemoveLeafWithLayout(
        adj01, n, leaf, positions.x, positions.y,
        CANVAS_W, CANVAS_H, seed, EDGE_SCALE,
    );
    if (!r) return;
    adj01 = r.adj01;
    n = r.n;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    startModeStatsWorker();
    const newPos: Position = { x: r.x, y: r.y };
    // animatePositions needs equal length: drop removed leaf from start frame
    const fromReduced: Position = { x: [], y: [] };
    for (let i = 0; i < animFrom.x.length; i++) {
        if (i === leaf) continue;
        fromReduced.x.push(animFrom.x[i]);
        fromReduced.y.push(animFrom.y[i]);
    }
    positions = fromReduced;
    render();
    await animatePositions(fromReduced, newPos, SIM_ANIM_MS, (pos) => { positions = pos; render(); });
    if (simId !== simToken) return;
    positions = newPos;
    updateSizeLabel();
    updateRemoveHalfButton();
    syncIoFromGraph();
    logState(positions); render();
}

async function removeHalfLeaves() {
    if (!positions || n <= MIN_N) return;
    let k = Math.floor(n / 2);
    if (n - k < MIN_N) k = n - MIN_N;
    if (k <= 0) return;

    const simId = ++simToken;
    await modulePromise;

    for (let i = 0; i < k; i++) {
        if (simId !== simToken) return;
        const adj = adj01ToAdjList(adj01, n);
        const leaf = findRemovableLeaf(adj);
        if (leaf < 0) break;
        const r = wasmGraphRemoveLeafWithLayout(
            adj01, n, leaf, positions.x, positions.y,
            CANVAS_W, CANVAS_H, seed, EDGE_SCALE,
        );
        if (!r) break;
        adj01 = r.adj01;
        n = r.n;
        positions = { x: r.x, y: r.y };
    }

    if (simId !== simToken) return;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    startModeStatsWorker();
    updateSizeLabel();
    updateInfo();
    updateBannerVisibility();
    syncIoFromGraph();
    render();
    logState(positions);
}

async function importPruferText(raw: string): Promise<void> {
    const parsed = parsePruferJson(raw);
    if (parsed.n < MIN_N || parsed.n > MAX_N) {
        throw new Error(`Decoded tree size n=${parsed.n} is outside [${MIN_N}, ${MAX_N}].`);
    }

    const decoded = wasmGraphTreePruferDecode(parsed.code0);
    const simId = ++simToken;
    const from = positions;
    adj01 = decoded.adj01;
    n = decoded.n;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    startModeStatsWorker();
    const newPos = runTreeLayout(adj01, n);
    positions = newPos;
    render();
    await animatePositions(from, newPos, SIM_ANIM_MS, (pos) => { positions = pos; render(); });
    if (simId !== simToken) return;
    positions = newPos;
    syncIoFromGraph();
    updateSizeLabel();
    updateRemoveHalfButton();
    updateInfo();
    updateBannerVisibility();
    render();
}

async function importEdgeListText(raw: string): Promise<{ base: 0 | 1; n: number }> {
    const parsed = parseEdgeListJson(raw);
    if (parsed.edges.length === 0) {
        throw new Error("Edge list must not be empty.");
    }

    let maxVertex = parsed.base === 1 ? 1 : 0;
    for (const [aRaw, bRaw] of parsed.edges) {
        maxVertex = Math.max(maxVertex, aRaw, bRaw);
    }
    const nextN = parsed.base === 1 ? maxVertex : (maxVertex + 1);
    if (nextN < MIN_N || nextN > MAX_N) {
        throw new Error(`Decoded tree size n=${nextN} is outside [${MIN_N}, ${MAX_N}].`);
    }

    const nextAdj = new Array(nextN * nextN).fill(0);
    for (const [aRaw, bRaw] of parsed.edges) {
        const a = parsed.base === 1 ? (aRaw - 1) : aRaw;
        const b = parsed.base === 1 ? (bRaw - 1) : bRaw;
        if (a < 0 || b < 0 || a >= nextN || b >= nextN) {
            throw new Error(`Vertex index out of range after base=${parsed.base} conversion: [${aRaw}, ${bRaw}]`);
        }
        if (a === b) {
            throw new Error(`Self-loop is not allowed in trees: [${aRaw}, ${bRaw}]`);
        }
        nextAdj[a * nextN + b] = 1;
        nextAdj[b * nextN + a] = 1;
    }

    // Validate imported graph is a tree.
    wasmGraphTreePruferEncode(nextAdj, nextN);

    const simId = ++simToken;
    const from = positions;
    adj01 = nextAdj;
    n = nextN;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    startModeStatsWorker();
    const newPos = runTreeLayout(adj01, n);
    positions = newPos;
    render();
    await animatePositions(from, newPos, SIM_ANIM_MS, (pos) => { positions = pos; render(); });
    if (simId !== simToken) return { base: parsed.base, n: nextN };
    positions = newPos;
    syncIoFromGraph();
    updateSizeLabel();
    updateRemoveHalfButton();
    updateInfo();
    updateBannerVisibility();
    render();
    return { base: parsed.base, n: nextN };
}

function updateRemoveHalfButton() {
    const btn = document.getElementById("btn-remove-half") as HTMLButtonElement | null;
    if (!btn) return;
    const k = Math.floor(n / 2);
    btn.disabled = n <= MIN_N || k <= 0 || n - k < MIN_N;
}

// ── Events ─────────────────────────────────────────────────────────

function canvasHit(e: MouseEvent): number {
    if (!positions) return -1;
    const c = document.getElementById("tree-canvas") as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    return hitNode((e.clientX - r.left) * CANVAS_W / r.width, (e.clientY - r.top) * CANVAS_H / r.height, positions);
}

async function onClick(e: MouseEvent) {
    const v = canvasHit(e);
    if (v >= 0 && n < MAX_N) await addLeafTo(v);
}

async function onContext(e: MouseEvent) {
    e.preventDefault();
    const v = canvasHit(e);
    if (v < 0) return;
    const adj = adj01ToAdjList(adj01, n);
    if (!isRemovableLeaf(v, adj, n)) return;
    await removeLeaf(v);
}

// ── Init ───────────────────────────────────────────────────────────

async function init() {
    const c = document.getElementById("tree-canvas") as HTMLCanvasElement;
    c.addEventListener("click", onClick);
    c.addEventListener("contextmenu", onContext);

    const b = (id: string) => document.getElementById(id)!;
    b("btn-inc").addEventListener("click", async () => { if (n < MAX_N) { n++; await regenerate(); } });
    b("btn-dec").addEventListener("click", async () => { if (n > MIN_N) { n--; await regenerate(); } });
    b("btn-randomize").addEventListener("click", async () => { seed = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0; await regenerate(); });
    b("btn-apply-seed").addEventListener("click", async () => {
        const v = parseInt((b("seed-input") as HTMLInputElement).value, 10);
        if (!isNaN(v) && v >= 0) { seed = v >>> 0; await regenerate(); }
    });
    b("btn-remove-half").addEventListener("click", async () => { await removeHalfLeaves(); updateRemoveHalfButton(); });

    const pruferInput = b("prufer-input") as HTMLTextAreaElement;
    pruferInput.placeholder = "[2,2,4]";
    pruferInput.value = pruferIoText;
    pruferInput.addEventListener("focus", () => {
        pruferInput.style.background = "#fff";
    });
    pruferInput.addEventListener("blur", () => {
        pruferInput.style.background = "#f7f0dc";
        syncIoFromGraph();
    });
    pruferInput.addEventListener("input", () => {
        pruferIoText = pruferInput.value;
        pruferIoStatus = "";
        pruferIoStatusIsError = false;
        updatePruferStatusUI();
    });

    b("btn-prufer-copy").addEventListener("click", async () => {
        try {
            pruferIoText = pruferInput.value;
            await writeClipboardText(pruferIoText);
            pruferIoStatus = "Copied.";
            pruferIoStatusIsError = false;
        } catch (e) {
            pruferIoStatus = (e as Error).message;
            pruferIoStatusIsError = true;
        }
        updatePruferStatusUI();
    });

    b("btn-prufer-import").addEventListener("click", async () => {
        try {
            pruferIoText = pruferInput.value;
            const parsed = parsePruferJson(pruferIoText);
            await importPruferText(pruferIoText);
            pruferIoStatus = `Imported (base=${parsed.base}, n=${parsed.n}).`;
            pruferIoStatusIsError = false;
        } catch (e) {
            pruferIoStatus = (e as Error).message;
            pruferIoStatusIsError = true;
        }
        updatePruferStatusUI();
    });

    const edgeInput = b("edge-input") as HTMLTextAreaElement;
    edgeInput.placeholder = "[[1,2],[2,3]]";
    edgeInput.value = edgeIoText;
    edgeInput.addEventListener("focus", () => {
        edgeInput.style.background = "#fff";
    });
    edgeInput.addEventListener("blur", () => {
        edgeInput.style.background = "#f7f0dc";
        syncIoFromGraph();
    });
    edgeInput.addEventListener("input", () => {
        edgeIoText = edgeInput.value;
        edgeIoStatus = "";
        edgeIoStatusIsError = false;
        updateEdgeStatusUI();
    });

    b("btn-edge-copy").addEventListener("click", async () => {
        try {
            edgeIoText = edgeInput.value;
            await writeClipboardText(edgeIoText);
            edgeIoStatus = "Copied.";
            edgeIoStatusIsError = false;
        } catch (e) {
            edgeIoStatus = (e as Error).message;
            edgeIoStatusIsError = true;
        }
        updateEdgeStatusUI();
    });

    b("btn-edge-import").addEventListener("click", async () => {
        try {
            edgeIoText = edgeInput.value;
            const result = await importEdgeListText(edgeIoText);
            edgeIoStatus = `Imported (base=${result.base}, n=${result.n}).`;
            edgeIoStatusIsError = false;
        } catch (e) {
            edgeIoStatus = (e as Error).message;
            edgeIoStatusIsError = true;
        }
        updateEdgeStatusUI();
    });

    setupCanvas(c);
    (b("seed-input") as HTMLInputElement).value = String(seed);
    updateSizeLabel();
    updateRemoveHalfButton();
    await regenerate();
}

init();
