import {
    modulePromise,
    wasmGraphRandomTree,
    wasmGraphAddLeafWithLayout,
    wasmGraphRemoveLeafWithLayout,
    wasmGraphForceLayout,
    wasmGraphTreeLayoutRadial,
    wasmGraphTreeMetricDimension,
} from "../tsl/wasm/ts/wasm_api_graph_demo";
// Animation helper (moved from visual_radial.ts into page scope)

export function animatePositions(oldPos: { x: number[]; y: number[] } | null, newPos: { x: number[]; y: number[] }, duration = 400, onFrame?: (pos: { x: number[]; y: number[] }) => void) {
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

const CANVAS_W = 800;
const CANVAS_H = 520;
const NODE_R = 18;
const MAX_N = 200;
const MIN_N = 2;
const EDGE_SCALE = 2.0;

let n = 10;
let seed = (Math.random() * 0xffffffff) >>> 0;
let adj01: number[] = [];
let positions: { x: number[]; y: number[] } | null = null;
let nodeTypes: { isExteriorMajor: boolean[]; isLeaf: boolean[]; basis: number[]; dimension: number } | null = null;

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

// Fast local adjacency-only helpers (no WASM) used for immediate UI feedback.
function adjAddLeaf(adj01_in: number[], n_in: number, parent: number): { adj01: number[]; n: number } {
    const nn = n_in + 1;
    const out = new Array(nn * nn).fill(0);
    for (let i = 0; i < n_in; i++) {
        for (let j = 0; j < n_in; j++) out[i * nn + j] = adj01_in[i * n_in + j];
    }
    for (let i = 0; i < nn; i++) { out[i * nn + n_in] = 0; out[n_in * nn + i] = 0; }
    out[parent * nn + n_in] = 1; out[n_in * nn + parent] = 1;
    return { adj01: out, n: nn };
}

function adjRemoveLeaf(adj01_in: number[], n_in: number, leaf: number): { adj01: number[]; n: number } | null {
    if (n_in <= 1) return null;
    // only allow if leaf exists
    let deg = 0; for (let j = 0; j < n_in; j++) if (adj01_in[leaf * n_in + j] !== 0) deg++;
    if (deg === 0) return null;
    const nn = n_in - 1;
    const out = new Array(nn * nn).fill(0);
    for (let i = 0, oi = 0; i < n_in; i++) {
        if (i === leaf) continue;
        for (let j = 0, oj = 0; j < n_in; j++) {
            if (j === leaf) continue;
            out[oi * nn + oj] = adj01_in[i * n_in + j];
            oj++;
        }
        oi++;
    }
    return { adj01: out, n: nn };
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
    updateInfo(); updateSizeLabel();
    (document.getElementById("seed-input") as HTMLInputElement).value = String(seed);
    updateBannerVisibility();
}

// ── Operations (all graph logic in C++/WASM) ───────────────────────

async function regenerate() {
    nodeTypes = null; positions = null; updateInfo();
    await modulePromise;
    const r = wasmGraphRandomTree(n, seed);
    adj01 = r.adj01;
    // Use radial layout computed in WASM; animate from previous positions.
    const newPos = wasmGraphTreeLayoutRadial(adj01, n, CANVAS_W, CANVAS_H);
    if (positions) {
        await animatePositions(positions, newPos, 400, (pos) => { positions = pos; render(); });
        positions = newPos;
    } else {
        // do not animate on initial load
        positions = newPos;
    }
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    logState(positions); render();
}

async function addLeafTo(parent: number) {
    if (!positions) return;
    // 1) Save pre-state
    const preAdj = Array.from(adj01);
    const preN = n;
    const preX = positions.x.slice();
    const preY = positions.y.slice();

    // 2) Compute adjacency-only result quickly so we can show the new node instantly
    const adjOnly = adjAddLeaf(preAdj, preN, parent);
    const tempX = preX.slice();
    const tempY = preY.slice();
    tempX.push(preX[parent]);
    tempY.push(preY[parent]);
    adj01 = adjOnly.adj01; n = adjOnly.n; positions = { x: tempX, y: tempY };
    render(); // immediate visual feedback: new node at parent

    // 3) Ask WASM to compute the final positions (uses old positions as init) and animate to them
    const r = wasmGraphAddLeafWithLayout(preAdj, preN, parent, preX, preY, CANVAS_W, CANVAS_H, seed, EDGE_SCALE);
    adj01 = r.adj01; n = r.n;
    const newPos = { x: r.x, y: r.y };
    await animatePositions(positions, newPos, 350, (pos) => { positions = pos; render(); });
    positions = newPos;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    logState(positions); render();
}

async function removeLeaf(leaf: number) {
    if (n <= MIN_N || !positions) return;
    // 1) Save pre-state
    const preAdj = Array.from(adj01);
    const preN = n;
    const preX = positions.x.slice();
    const preY = positions.y.slice();

    // 2) Compute adjacency-only (fast) and remove the leaf visually immediately
    const adjOnly = adjRemoveLeaf(preAdj, preN, leaf);
    if (!adjOnly) return;
    const tempX: number[] = [];
    const tempY: number[] = [];
    for (let i = 0; i < preN; i++) {
        if (i === leaf) continue;
        tempX.push(preX[i]);
        tempY.push(preY[i]);
    }
    adj01 = adjOnly.adj01; n = adjOnly.n; positions = { x: tempX, y: tempY };
    render(); // immediate visual feedback: node removed

    // 3) Ask WASM for refined layout and animate to it
    const r = wasmGraphRemoveLeafWithLayout(preAdj, preN, leaf, preX, preY, CANVAS_W, CANVAS_H, seed, EDGE_SCALE);
    if (!r) return;
    const newPos = { x: r.x, y: r.y };
    await animatePositions(positions, newPos, 350, (pos) => { positions = pos; render(); });
    adj01 = r.adj01; n = r.n; positions = newPos;
    nodeTypes = wasmGraphTreeMetricDimension(adj01, n);
    logState(positions); render();
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
    if (adj[v].length > 1 || (v === 0 && n > 2)) return;
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

    setupCanvas(c);
    (b("seed-input") as HTMLInputElement).value = String(seed);
    updateSizeLabel();
    await regenerate();
}

init();
