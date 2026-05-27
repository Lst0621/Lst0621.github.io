import {
    modulePromise,
    wasmGraphRandomTree,
    wasmGraphAddLeafWithLayout,
    wasmGraphRemoveLeafWithLayout,
    wasmGraphTreeLayoutRadial,
    wasmGraphTreeMetricDimension,
} from "../tsl/wasm/ts/wasm_api_graph_demo";
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

/** Full relayout: radial, every node position recomputed from the tree shape. */
function runTreeLayout(adj01_in: number[], nv: number): Position {
    return wasmGraphTreeLayoutRadial(adj01_in, nv, CANVAS_W, CANVAS_H);
}

let n = 10;
let seed = (Math.random() * 0xffffffff) >>> 0;
let adj01: number[] = [];
let positions: Position | null = null;
let nodeTypes: { isExteriorMajor: boolean[]; isLeaf: boolean[]; basis: number[]; dimension: number } | null = null;
let simToken = 0;

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
    const dimEl = document.getElementById("dim-value")!;
    const basisEl = document.getElementById("basis-value")!;
    const formulaEl = document.getElementById("formula-value")!;
    if (!nodeTypes) { dimEl.textContent = "..."; basisEl.textContent = "..."; formulaEl.textContent = ""; return; }
    dimEl.textContent = String(nodeTypes.dimension);
    basisEl.textContent = nodeTypes.basis.length > 0 ? "{" + nodeTypes.basis.join(", ") + "}" : "{}";
    const lc = nodeTypes.isLeaf.filter(Boolean).length;
    const mc = nodeTypes.isExteriorMajor.filter(Boolean).length;
    formulaEl.textContent = `(${lc} leaves − ${mc} ext-major = ${nodeTypes.dimension})`;
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
}

// ── Operations (all graph logic in C++/WASM) ───────────────────────

async function regenerate() {
    nodeTypes = null; positions = null; updateInfo();
    await modulePromise;
    const r = wasmGraphRandomTree(n, seed);
    adj01 = r.adj01;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    const simId = ++simToken;
    const newPos = runTreeLayout(adj01, n);
    const from = positions;
    positions = newPos;
    render();
    await animatePositions(from, newPos, SIM_ANIM_MS, (pos) => { positions = pos; render(); });
    if (simId !== simToken) return;
    positions = newPos;
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
    const newPos: Position = { x: r.x, y: r.y };
    positions = animFrom;
    render();
    await animatePositions(animFrom, newPos, SIM_ANIM_MS, (pos) => { positions = pos; render(); });
    if (simId !== simToken) return;
    positions = newPos;
    updateSizeLabel();
    updateRemoveHalfButton();
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
    updateSizeLabel();
    updateInfo();
    updateBannerVisibility();
    render();
    logState(positions);
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

    setupCanvas(c);
    (b("seed-input") as HTMLInputElement).value = String(seed);
    updateSizeLabel();
    updateRemoveHalfButton();
    await regenerate();
}

init();
