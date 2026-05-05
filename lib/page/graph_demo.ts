import {
    wasmGraphBasicInfo,
    wasmGraphAllPairsDistances,
    wasmGraphPdimAllModes,
    wasmGraphRandomizeUndirectedAdj01,
    wasmGraphResolvingSubsetsCacheCreate,
} from "../tsl/wasm/ts/wasm_api_graph_demo";

let n = 8;
const PAGE_SIZE = 50;
type HighlightMode = "node" | "edge" | "mixed";
let highlightMode: HighlightMode = "node";
type ActiveKind = "resolving" | "non_resolving";
let activeKind: ActiveKind = "resolving";
let selectedResolvingIdx: Record<HighlightMode, number> = { node: 0, edge: 0, mixed: 0 };
let selectedNonResolvingIdx: Record<HighlightMode, number> = { node: 0, edge: 0, mixed: 0 };
let currentRandomSeed = 0;
let currentRandomThreshold = 0.0;
type ResolveResult = {
    minDimension: number;
    smallestBasis: number[];
    subsets: number[][];
    truncated: boolean;
    minSizeSubsets: number[][];
    minSizeTruncated: boolean;
    totalCount: number;
    pageCount: number;
};
type NonResolveResult = {
    subsets: number[][];
    truncated: boolean;
    totalCount: number;
    pageCount: number;
};
type PdimResult = {
    node: string;
    edge: string;
    mixed: string;
};
let graphVersion = 0;
let nodePageIndex = 0;
let edgePageIndex = 0;
let mixedPageIndex = 0;
let nodeNonResolvingPageIndex = 0;
let edgeNonResolvingPageIndex = 0;
let mixedNonResolvingPageIndex = 0;
let cachedMetricKey = ""; // Only depends on graphVersion, used to avoid recomputing metrics when pages change
let cachedResolveKey = ""; // Includes page indices, used to determine which subsets to display
let cachedNonResolveKey = "";
let cachedPdimKey = "";
let cachedNodeRes: ResolveResult | null = null;
let cachedEdgeRes: ResolveResult | null = null;
let cachedMixedRes: ResolveResult | null = null;
let cachedNodeNonResolveRes: NonResolveResult | null = null;
let cachedEdgeNonResolveRes: NonResolveResult | null = null;
let cachedMixedNonResolveRes: NonResolveResult | null = null;
let cachedPdimRes: PdimResult | null = null;
let cachedDistKey = "";
let cachedDistFlat: number[] | null = null;
let cachedGraphSnapshotVersion = -1;
let cachedGraphAdj01: number[] = [];
let cachedGraphEdges: Array<{ a: number; b: number }> = [];
let cachedGraphBasicInfo: { edgeCount: number; diameter: number } | null = null;
let cachedGraphDistFlat: number[] | null = null;
let wasmResolveCache: ReturnType<typeof wasmGraphResolvingSubsetsCacheCreate> | null = null;
let wasmResolveCacheGraphVersion = -1;
// Animated loading frames
const LOADING_FRAMES_METRICS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const LOADING_FRAMES_BASIS = ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'];
const LOADING_FRAMES_PDIM = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

function getLoadingAnimation(type: 'metrics' | 'basis' | 'pdim' = 'metrics'): string {
    const frames = type === 'pdim' ? LOADING_FRAMES_PDIM : type === 'basis' ? LOADING_FRAMES_BASIS : LOADING_FRAMES_METRICS;
    const frameIndex = Math.floor((Date.now() / 80) % frames.length);
    return frames[frameIndex];
}

// Helper: show animated loading for values that are still being calculated
function formatComputingPlaceholder(isComputing: boolean, value: number | string, kind: 'metrics' | 'pdim' = 'metrics', showLoading = true): string {
    if (!isComputing) return String(value);
    return showLoading ? getLoadingAnimation(kind) : "&nbsp;";
}

function formatSelectedBasisPlaceholder(isComputing: boolean, basis: readonly number[], showLoading = true): string {
    if (isComputing && basis.length === 0) {
        return showLoading ? getLoadingAnimation('basis') : "&nbsp;";
    }
    return subsetToString1Based(basis);
}

let animationRefreshInterval: number | null = null;
let loadingAnimationDelayTimer: number | null = null;
let loadingAnimationVisible = false;

function startLoadingAnimationDelay(): void {
    if (loadingAnimationDelayTimer !== null) {
        clearTimeout(loadingAnimationDelayTimer);
    }
    loadingAnimationVisible = false;
    loadingAnimationDelayTimer = setTimeout(() => {
        loadingAnimationVisible = true;
        loadingAnimationDelayTimer = null;
        renderSummaryOnly();
    }, 150) as unknown as number;
}

function stopLoadingAnimationDelay(): void {
    if (loadingAnimationDelayTimer !== null) {
        clearTimeout(loadingAnimationDelayTimer);
        loadingAnimationDelayTimer = null;
    }
    loadingAnimationVisible = false;
}

function getGraphSnapshot(): {
    adj01: number[];
    basicInfo: { edgeCount: number; diameter: number };
    distFlat: number[];
    edges: Array<{ a: number; b: number }>;
} {
    if (cachedGraphSnapshotVersion !== graphVersion) {
        cachedGraphAdj01 = adj.flat().map(v => v ? 1 : 0);
        cachedGraphBasicInfo = wasmGraphBasicInfo(cachedGraphAdj01, n, false);
        cachedGraphEdges = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (adj[i][j]) cachedGraphEdges.push({ a: i, b: j });
            }
        }
        cachedGraphDistFlat = null;
        cachedGraphSnapshotVersion = graphVersion;
    }
    if (cachedGraphDistFlat === null) {
        cachedGraphDistFlat = cachedDistFlat && cachedDistKey === `${graphVersion}`
            ? cachedDistFlat
            : wasmGraphAllPairsDistances(cachedGraphAdj01, n, false);
    }
    return {
        adj01: cachedGraphAdj01,
        basicInfo: cachedGraphBasicInfo || { edgeCount: 0, diameter: -1 },
        distFlat: cachedGraphDistFlat,
        edges: cachedGraphEdges,
    };
}

function updateSummaryAnimationOnly(): void {
    const { graphSummary } = ensureElements();
    const summaryHtml = graphSummary.innerHTML;
    // Replace animation frames with fresh ones
    const updated = summaryHtml
        .replace(/[\u280b\u2819\u2839\u2838\u283c\u2834\u2826\u2827\u2807\u280f]/g, () => getLoadingAnimation('metrics'))
        .replace(/[\u2801\u2802\u2804\u2840\u2880\u2820\u2810\u2808]/g, () => getLoadingAnimation('basis'))
        .replace(/[\u28fe\u28fd\u28fb\u28bf\u287f\u28df\u28ef\u28f7]/g, () => getLoadingAnimation('pdim'));
    if (updated !== summaryHtml) {
        graphSummary.innerHTML = updated;
    }
}

// Metric computation worker (for resolving / non-resolving page enumeration)
let metricWorker: Worker | null = null;
let wasmMemorySizeBytes = 0; // Detected at runtime
let graphIoText = "";
let graphIoStatus = "";
let graphIoIsEditing = false;

function startMetricWorker(
    adj01: number[],
    nVerts: number,
    pageSize: number,
    resolvePageIndices: [number, number, number],
    nonResolvePageIndices: [number, number, number],
) {
    if (metricWorker) {
        try { metricWorker.terminate(); } catch (_) {}
        metricWorker = null;
    }

    metricWorker = new Worker('/assets/js/page/metric_worker.js', { type: 'module' });
    
    // Start animation refresh while computing - only update animation frames, not full page
    startLoadingAnimationDelay();
    if (animationRefreshInterval) clearInterval(animationRefreshInterval);
    animationRefreshInterval = setInterval(() => updateSummaryAnimationOnly(), 100) as unknown as number;
    
    metricWorker.onmessage = (e) => {
        const d = e.data as any;
        if (d.wasmMemoryBytes && wasmMemorySizeBytes === 0) {
            wasmMemorySizeBytes = d.wasmMemoryBytes;
        }
        if (d.error) {
            console.error('metric worker error:', d.error);
            const isOOM = d.isOOM || d.error.includes('OOM') || d.error.includes('out of memory');
            graphIoStatus = isOOM ? 'Worker OOM: Try smaller graph' : `Worker error: ${d.error}`;
            metricWorker?.terminate();
            metricWorker = null;
            stopLoadingAnimationDelay();
            if (animationRefreshInterval) {
                clearInterval(animationRefreshInterval);
                animationRefreshInterval = null;
            }
            renderAll();
            return;
        }
        if (d.stage === 'resolved_parsed' && d.allModesRes) {
            cachedNodeRes = d.allModesRes.node;
            cachedEdgeRes = d.allModesRes.edge;
            cachedMixedRes = d.allModesRes.mixed;
            cachedMetricKey = `${graphVersion}`;
            cachedResolveKey = `${graphVersion}:${resolvePageIndices[0]}:${resolvePageIndices[1]}:${resolvePageIndices[2]}`;
            renderAll();
        }
        if (d.stage === 'done' && d.allModesNonResolveRes) {
            cachedNodeNonResolveRes = d.allModesNonResolveRes.node;
            cachedEdgeNonResolveRes = d.allModesNonResolveRes.edge;
            cachedMixedNonResolveRes = d.allModesNonResolveRes.mixed;
            cachedNonResolveKey = `${graphVersion}:${nonResolvePageIndices[0]}:${nonResolvePageIndices[1]}:${nonResolvePageIndices[2]}`;
            if (Array.isArray(d.distFlat)) {
                cachedDistFlat = d.distFlat as number[];
                cachedDistKey = `${graphVersion}`;
            }
            if (d.pdimRes) {
                cachedPdimRes = d.pdimRes;
                cachedPdimKey = `${graphVersion}`;
            }
        }
        if (d.stage === 'done') {
            try { metricWorker?.terminate(); } catch (_) {}
            metricWorker = null;
            stopLoadingAnimationDelay();
            if (animationRefreshInterval) {
                clearInterval(animationRefreshInterval);
                animationRefreshInterval = null;
            }
            graphIoStatus = '';
            renderAll();
        } else {
            // Partial update
            renderAll();
        }
    };

    metricWorker.postMessage({
        cmd: 'start',
        adj01,
        n: nVerts,
        pageSize,
        resolvePageIndices,
        nonResolvePageIndices,
    });
}

function ensureWasmResolveCache(): ReturnType<typeof wasmGraphResolvingSubsetsCacheCreate> {
    if (wasmResolveCache) {
        return wasmResolveCache;
    }
    wasmResolveCache = wasmGraphResolvingSubsetsCacheCreate();
    if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", () => {
            if (wasmResolveCache) {
                wasmResolveCache.free();
                wasmResolveCache = null;
                wasmResolveCacheGraphVersion = -1;
            }
        });
    }
    return wasmResolveCache;
}

// Undirected adjacency: keep adj[i][j] === adj[j][i].
let adj: boolean[][] = [];

type EdgeList = Array<[number, number]>;

type Theme = {
    panelBorder: string;
    headerBg: string;
    headerText: string;
    basisHeaderBg: string;
    basisHeaderText: string;
    cellOn: string;
    cellOff: string;
    cellDisabled: string;
    cellText: string;
    canvasEdge: string;
    canvasNodeFill: string;
    canvasNodeStroke: string;
    canvasNodeText: string;
    canvasBasisFill: string;
    canvasBasisStroke: string;
    canvasArrow: string;
};

const theme: Theme = {
    // Solarized Light-inspired
    panelBorder: "#93a1a1",
    headerBg: "#eee8d5",
    headerText: "#073642",
    basisHeaderBg: "#b58900",
    basisHeaderText: "#fdf6e3",
    cellOn: "#268bd2",
    cellOff: "#fdf6e3",
    cellDisabled: "#e4ddc8",
    cellText: "#073642",
    canvasEdge: "#268bd2",
    canvasNodeFill: "#fdf6e3",
    canvasNodeStroke: "#268bd2",
    canvasNodeText: "#073642",
    canvasBasisFill: "#b58900",
    canvasBasisStroke: "#b58900",
    canvasArrow: "#268bd2",
};

const NON_RESOLVING_PALETTE = [
    "#ffd9d9",
    "#d9e8ff",
    "#dff2d9",
    "#fce6ff",
    "#fff3c4",
    "#d9f0f0",
    "#f0d9ff",
    "#e6e6ff",
];

function vecKey(vec: readonly number[]): string {
    return vec.join(",");
}

/** Same-color rows share the same basis-restricted distance vector; singletons use neutral. */
function collisionRowColorsFromItems(items: Array<{ key: string; vec: readonly number[] }>): Map<string, string> {
    const buckets = new Map<string, string[]>();
    for (const { key, vec } of items) {
        const k = vecKey(vec);
        let arr = buckets.get(k);
        if (!arr) {
            arr = [];
            buckets.set(k, arr);
        }
        arr.push(key);
    }
    const out = new Map<string, string>();
    let paletteIdx = 0;
    for (const [, keys] of buckets) {
        if (keys.length <= 1) {
            for (const key of keys) {
                out.set(key, theme.cellOff);
            }
        } else {
            const color = NON_RESOLVING_PALETTE[paletteIdx % NON_RESOLVING_PALETTE.length];
            paletteIdx++;
            for (const key of keys) {
                out.set(key, color);
            }
        }
    }
    return out;
}

function buildNonResolvingRowColorMap(
    highlightMode: HighlightMode,
    basis: readonly number[],
    distFlat: readonly number[],
    edges: ReadonlyArray<{ a: number; b: number }>,
    nVerts: number,
): Map<string, string> | null {
    if (basis.length === 0) {
        return null;
    }
    const basisSorted = [...basis].sort((a, b) => a - b);
    const items: Array<{ key: string; vec: readonly number[] }> = [];
    if (highlightMode === "node" || highlightMode === "mixed") {
        for (let v = 0; v < nVerts; v++) {
            const vec = basisSorted.map((b) => distFlat[b * nVerts + v]);
            items.push({ key: `n:${v}`, vec });
        }
    }
    if (highlightMode === "edge" || highlightMode === "mixed") {
        for (const e of edges) {
            const vec = basisSorted.map((b) => {
                const da = distFlat[b * nVerts + e.a];
                const db = distFlat[b * nVerts + e.b];
                if (da === -1 && db === -1) {
                    return -1;
                }
                if (da === -1) {
                    return db;
                }
                if (db === -1) {
                    return da;
                }
                return Math.min(da, db);
            });
            items.push({ key: `e:${e.a},${e.b}`, vec });
        }
    }
    return collisionRowColorsFromItems(items);
}

function collisionGroupsOneLiner(
    highlightMode: HighlightMode,
    basis: readonly number[],
    distFlat: readonly number[],
    edges: ReadonlyArray<{ a: number; b: number }>,
    nVerts: number,
): string {
    if (basis.length === 0) {
        return "Collision groups: (empty basis)";
    }
    const basisSorted = [...basis].sort((a, b) => a - b);
    type Labeled = { label: string; vec: readonly number[] };
    const labeled: Labeled[] = [];
    if (highlightMode === "node" || highlightMode === "mixed") {
        for (let v = 0; v < nVerts; v++) {
            const vec = basisSorted.map((b) => distFlat[b * nVerts + v]);
            labeled.push({ label: `${v + 1}`, vec });
        }
    }
    if (highlightMode === "edge" || highlightMode === "mixed") {
        for (const e of edges) {
            const vec = basisSorted.map((b) => {
                const da = distFlat[b * nVerts + e.a];
                const db = distFlat[b * nVerts + e.b];
                if (da === -1 && db === -1) {
                    return -1;
                }
                if (da === -1) {
                    return db;
                }
                if (db === -1) {
                    return da;
                }
                return Math.min(da, db);
            });
            labeled.push({ label: `${e.a + 1}-${e.b + 1}`, vec });
        }
    }
    const vecToLabels = new Map<string, string[]>();
    for (const it of labeled) {
        const vk = vecKey(it.vec);
        let arr = vecToLabels.get(vk);
        if (!arr) {
            arr = [];
            vecToLabels.set(vk, arr);
        }
        arr.push(it.label);
    }
    const collisionParts: string[] = [];
    for (const [, labels] of vecToLabels) {
        if (labels.length > 1) {
            collisionParts.push(`{${labels.join(",")}}`);
        }
    }
    if (collisionParts.length === 0) {
        return "Collision groups (all distinct): 0";
    }
    return `Collision groups: ${collisionParts.length} (${collisionParts.join(", ")})`;
}

function initAdj(size: number): void {
    adj = [];
    for (let i = 0; i < size; i++) {
        const row: boolean[] = [];
        for (let j = 0; j < size; j++) {
            row.push(false);
        }
        adj.push(row);
    }
}

function invalidateResolveCache(): void {
    graphVersion++;
    cachedResolveKey = "";
    cachedNonResolveKey = "";
    cachedPdimKey = "";
    cachedNodeRes = null;
    cachedEdgeRes = null;
    cachedMixedRes = null;
    cachedNodeNonResolveRes = null;
    cachedEdgeNonResolveRes = null;
    cachedMixedNonResolveRes = null;
    cachedPdimRes = null;
    wasmResolveCacheGraphVersion = -1;
    // Keep highlightMode, activeKind, pager indices, and subset selection across graph edits;
    // renderAll clamps page indices when the new graph has fewer pages.
}

function setAdjFromAdj01Flat(flatAdj01: readonly number[]): void {
    const needed = n * n;
    if (flatAdj01.length !== needed) {
        throw new Error(`setAdjFromAdj01Flat: expected ${needed} entries, got ${flatAdj01.length}`);
    }
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            adj[i][j] = flatAdj01[i * n + j] !== 0;
        }
    }
    invalidateResolveCache();
}

function createRandomSeed(): number {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return arr[0];
    }
    return (Math.floor(Math.random() * 0x100000000) >>> 0);
}

function randomizeGraphWithSeed(seed: number): void {
    const rnd = wasmGraphRandomizeUndirectedAdj01(n, seed);
    setAdjFromAdj01Flat(rnd.adj01);
    currentRandomSeed = seed >>> 0;
    currentRandomThreshold = rnd.threshold;
}

function ensureElements(): {
    graphText: HTMLDivElement;
    graphSummary: HTMLDivElement;
    controls: HTMLDivElement;
    canvas: HTMLCanvasElement;
    adjTable: HTMLTableElement;
    distEdgeTable: HTMLTableElement;
} {
    const graphText = document.getElementById("graph_text") as HTMLDivElement | null;
    const graphSummary = document.getElementById("graph-summary") as HTMLDivElement | null;
    const controls = document.getElementById("controls") as HTMLDivElement | null;
    const canvas = document.getElementById("graph_canvas") as HTMLCanvasElement | null;
    const adjTable = document.getElementById("adj_table") as HTMLTableElement | null;
    const distEdgeTable = document.getElementById("dist_edge_table") as HTMLTableElement | null;
    if (!graphText || !graphSummary || !controls || !canvas || !adjTable || !distEdgeTable) {
        throw new Error("Required DOM elements not found.");
    }
    return { graphText, graphSummary, controls, canvas, adjTable, distEdgeTable };
}

function clearTable(table: HTMLTableElement): void {
    while (table.rows.length > 0) {
        table.deleteRow(0);
    }
}

function renderControls(
    container: HTMLDivElement,
    pageInfo: {
        nodePageCount: number;
        edgePageCount: number;
        mixedPageCount: number;
        nodeNonResolvingPageCount: number;
        edgeNonResolvingPageCount: number;
        mixedNonResolvingPageCount: number;
        nodeResolvingMinCount: number;
        edgeResolvingMinCount: number;
        mixedResolvingMinCount: number;
        nodeNonResolveSubsetCount: number;
        edgeNonResolveSubsetCount: number;
        mixedNonResolveSubsetCount: number;
        nodeNonResolveSubsets: number[][];
        edgeNonResolveSubsets: number[][];
        mixedNonResolveSubsets: number[][];
    },
): void {
    container.innerHTML = "";

    const sizeLabel = document.createElement("span");
    sizeLabel.innerText = `n=${n}`;
    sizeLabel.style.fontFamily = "ui-monospace, Courier";

    const decBtn = document.createElement("button");
    decBtn.innerText = "-";
    decBtn.onclick = () => {
        if (n <= 2) {
            return;
        }
        n--;
        initAdj(n);
        randomizeGraphWithSeed(createRandomSeed());
        renderAll();
    };

    const incBtn = document.createElement("button");
    incBtn.innerText = "+";
    incBtn.onclick = () => {
        if (n >= 25) {
            return;
        }
        n++;
        initAdj(n);
        randomizeGraphWithSeed(createRandomSeed());
        renderAll();
    };

    const presetLabel = document.createElement("span");
    presetLabel.innerText = "presets:";
    presetLabel.style.fontFamily = "ui-monospace, Courier";

    const btnPath = document.createElement("button");
    btnPath.innerText = "P_n";
    btnPath.onclick = () => {
        setPathGraph();
        renderAll();
    };

    const btnCycle = document.createElement("button");
    btnCycle.innerText = "C_n";
    btnCycle.onclick = () => {
        setCycleGraph();
        renderAll();
    };

    const btnComplete = document.createElement("button");
    btnComplete.innerText = "K_n";
    btnComplete.onclick = () => {
        setCompleteGraph();
        renderAll();
    };

    const btnRandom = document.createElement("button");
    btnRandom.innerText = "Randomize";
    btnRandom.onclick = () => {
        const seed = createRandomSeed();
        randomizeGraphWithSeed(seed);
        renderAll();
    };

    const randomInfo = document.createElement("span");
    randomInfo.style.fontFamily = "ui-monospace, Courier";
    randomInfo.innerText =
        `seed=${currentRandomSeed} thres=${currentRandomThreshold.toFixed(3)}`;

    const spacer = (w: number) => {
        const s = document.createElement("span");
        s.style.display = "inline-block";
        s.style.width = `${w}px`;
        return s;
    };

    container.appendChild(decBtn);
    container.appendChild(incBtn);
    container.appendChild(sizeLabel);
    container.appendChild(spacer(8));
    container.appendChild(presetLabel);
    container.appendChild(btnPath);
    container.appendChild(btnCycle);
    container.appendChild(btnComplete);
    container.appendChild(btnRandom);
    container.appendChild(randomInfo);

    const lineBreak1 = document.createElement("div");
    lineBreak1.style.flexBasis = "100%";
    lineBreak1.style.height = "0";
    container.appendChild(lineBreak1);

    const highlightLabel = document.createElement("span");
    highlightLabel.innerText = "highlight:";
    highlightLabel.style.fontFamily = "ui-monospace, Courier";
    container.appendChild(highlightLabel);

    const mkHighlightBtn = (label: string, val: HighlightMode) => {
        const b = document.createElement("button");
        b.innerText = label;
        b.onclick = () => {
            highlightMode = val;
            renderAll();
        };
        if (highlightMode === val) {
            b.style.fontWeight = "700";
        }
        return b;
    };

    container.appendChild(mkHighlightBtn("node", "node"));
    container.appendChild(mkHighlightBtn("edge", "edge"));
    container.appendChild(mkHighlightBtn("mixed", "mixed"));

    container.appendChild(spacer(8));
    const activeLabel = document.createElement("span");
    activeLabel.innerText = "active:";
    activeLabel.style.fontFamily = "ui-monospace, Courier";
    container.appendChild(activeLabel);

    const mkActiveBtn = (label: string, val: ActiveKind) => {
        const b = document.createElement("button");
        b.innerText = label;
        b.onclick = () => {
            if (activeKind === val) {
                return;
            }
            activeKind = val;
            if (val === "resolving") {
                if (pageInfo.nodeResolvingMinCount > 0) {
                    selectedResolvingIdx.node = Math.floor(Math.random() * pageInfo.nodeResolvingMinCount);
                }
                if (pageInfo.edgeResolvingMinCount > 0) {
                    selectedResolvingIdx.edge = Math.floor(Math.random() * pageInfo.edgeResolvingMinCount);
                }
                if (pageInfo.mixedResolvingMinCount > 0) {
                    selectedResolvingIdx.mixed = Math.floor(Math.random() * pageInfo.mixedResolvingMinCount);
                }
            } else {
                selectedNonResolvingIdx.node = randomNonResolvingIdx(pageInfo.nodeNonResolveSubsets);
                selectedNonResolvingIdx.edge = randomNonResolvingIdx(pageInfo.edgeNonResolveSubsets);
                selectedNonResolvingIdx.mixed = randomNonResolvingIdx(pageInfo.mixedNonResolveSubsets);
            }
            renderAll();
        };
        if (activeKind === val) {
            b.style.fontWeight = "700";
        }
        return b;
    };
    container.appendChild(mkActiveBtn("resolving", "resolving"));
    container.appendChild(mkActiveBtn("non-resolving", "non_resolving"));

    const lineBreakBeforePageSize = document.createElement("div");
    lineBreakBeforePageSize.style.flexBasis = "100%";
    lineBreakBeforePageSize.style.height = "0";
    container.appendChild(lineBreakBeforePageSize);

    const lineBreakSelUnified = document.createElement("div");
    lineBreakSelUnified.style.flexBasis = "100%";
    lineBreakSelUnified.style.height = "0";
    container.appendChild(lineBreakSelUnified);

    const resolvingMinCountFor = (m: HighlightMode): number =>
        m === "node" ? pageInfo.nodeResolvingMinCount : m === "edge" ? pageInfo.edgeResolvingMinCount : pageInfo.mixedResolvingMinCount;
    const nonResolveSubsetsFor = (m: HighlightMode): number[][] =>
        m === "node" ? pageInfo.nodeNonResolveSubsets : m === "edge" ? pageInfo.edgeNonResolveSubsets : pageInfo.mixedNonResolveSubsets;

    const selUnifiedLabel = document.createElement("span");
    selUnifiedLabel.style.fontFamily = "ui-monospace, Courier";
    {
        const m = highlightMode;
        if (activeKind === "resolving") {
            const c = resolvingMinCountFor(m);
            const shown = c > 0 ? (selectedResolvingIdx[m] % c) + 1 : 0;
            selUnifiedLabel.innerText = `sel min-resolving (${m}): ${shown}/${c}`;
        } else {
            const subs = nonResolveSubsetsFor(m);
            const c = subs.length;
            const shown = c > 0 ? (selectedNonResolvingIdx[m] % c) + 1 : 0;
            selUnifiedLabel.innerText = `sel non-resolving (${m}): ${shown}/${c}`;
        }
    }
    container.appendChild(spacer(6));
    container.appendChild(selUnifiedLabel);

    const selCount = activeKind === "resolving"
        ? resolvingMinCountFor(highlightMode)
        : nonResolveSubsetsFor(highlightMode).length;

    const selNextB = document.createElement("button");
    selNextB.innerText = "Next";
    selNextB.disabled = selCount <= 0;
    selNextB.onclick = () => {
        const m = highlightMode;
        if (activeKind === "resolving") {
            const c = resolvingMinCountFor(m);
            if (c <= 0) {
                return;
            }
            selectedResolvingIdx[m] = (selectedResolvingIdx[m] + 1) % c;
        } else {
            const subs = nonResolveSubsetsFor(m);
            if (subs.length <= 0) {
                return;
            }
            advanceNonResolvingIdx(subs, m);
        }
        renderAll();
    };
    container.appendChild(selNextB);

    const selRandB = document.createElement("button");
    selRandB.innerText = "Random";
    selRandB.disabled = selCount <= 0;
    selRandB.onclick = () => {
        const m = highlightMode;
        if (activeKind === "resolving") {
            const c = resolvingMinCountFor(m);
            if (c <= 0) {
                return;
            }
            selectedResolvingIdx[m] = Math.floor(Math.random() * c);
        } else {
            const subs = nonResolveSubsetsFor(m);
            if (subs.length <= 0) {
                return;
            }
            selectedNonResolvingIdx[m] = randomNonResolvingIdx(subs);
        }
        renderAll();
    };
    container.appendChild(selRandB);

    container.appendChild(spacer(10));

    const ioWrap = document.createElement("div");
    ioWrap.style.display = "flex";
    ioWrap.style.flexWrap = "wrap";
    ioWrap.style.gap = "8px";
    ioWrap.style.alignItems = "center";
    ioWrap.style.justifyContent = "center";

    const ioLabel = document.createElement("span");
    ioLabel.style.display = "flex";
    ioLabel.style.alignItems = "center";
    ioLabel.style.gap = "6px";
    ioLabel.style.whiteSpace = "nowrap";
    ioLabel.style.minWidth = "0";

    const ioLabelText = document.createElement("span");
    ioLabelText.innerText = "edges JSON";
    ioLabelText.style.fontFamily = "ui-monospace, Courier";
    ioLabel.appendChild(ioLabelText);

    const tip = document.createElement("span");
    tip.innerText = "i";
    tip.tabIndex = 0;
    tip.setAttribute("aria-label", "Edges JSON info");
    tip.style.position = "relative";
    tip.style.display = "inline-flex";
    tip.style.alignItems = "center";
    tip.style.justifyContent = "center";
    tip.style.width = "18px";
    tip.style.height = "18px";
    tip.style.borderRadius = "999px";
    tip.style.border = `1px solid ${theme.panelBorder}`;
    tip.style.background = "#f7f0dc";
    tip.style.color = theme.headerText;
    tip.style.fontSize = "12px";
    tip.style.lineHeight = "1";
    tip.style.cursor = "help";
    tip.style.userSelect = "none";
    tip.style.flex = "0 0 auto";

    const tipText = document.createElement("span");
    tipText.innerText = "Format: [[1,2],[2,3]] or [[0,1],[1,2]] (1-based or 0-based)";
    tipText.style.position = "absolute";
    tipText.style.display = "block";
    tipText.style.right = "0";
    tipText.style.bottom = "22px";
    tipText.style.width = "300px";
    tipText.style.maxWidth = "72vw";
    tipText.style.padding = "8px 10px";
    tipText.style.border = `1px solid ${theme.panelBorder}`;
    tipText.style.borderRadius = "10px";
    tipText.style.background = "#fff";
    tipText.style.color = theme.headerText;
    tipText.style.boxShadow = "0 10px 30px rgba(0,0,0,0.18)";
    tipText.style.fontSize = "12px";
    tipText.style.lineHeight = "1.25";
    tipText.style.whiteSpace = "normal";
    tipText.style.opacity = "0";
    tipText.style.transform = "translate(0, -2px)";
    tipText.style.pointerEvents = "none";
    tipText.style.zIndex = "20";
    tipText.style.transition = "opacity 0.12s ease, transform 0.12s ease";

    const showTip = () => {
        tipText.style.opacity = "1";
        tipText.style.transform = "translate(0, 0)";
        tipText.style.pointerEvents = "auto";
    };
    const hideTip = () => {
        tipText.style.opacity = "0";
        tipText.style.transform = "translate(0, -2px)";
        tipText.style.pointerEvents = "none";
    };

    tip.addEventListener("mouseenter", showTip);
    tip.addEventListener("mouseleave", hideTip);
    tip.addEventListener("focus", showTip);
    tip.addEventListener("blur", hideTip);

    tip.appendChild(tipText);
    ioLabel.appendChild(tip);
    ioWrap.appendChild(ioLabel);

    const ta = document.createElement("textarea");
    ta.rows = 3;
    ta.cols = 46;
    ta.placeholder = `[[1,2],[2,3]]`;
    ta.value = graphIoText;
    ta.style.fontFamily = "ui-monospace, Courier";
    ta.style.fontSize = "12px";
    ta.style.border = `1px solid ${theme.panelBorder}`;
    ta.style.borderRadius = "8px";
    ta.style.padding = "6px 8px";
    ta.style.background = "#f7f0dc";
    ta.style.color = theme.headerText;
    ta.title = "Format: [[1,2],[2,3]] or [[0,1],[1,2]] (1-based or 0-based)";
    ta.onfocus = () => {
        graphIoIsEditing = true;
        ta.style.background = "#fff";
    };
    ta.onblur = () => {
        graphIoIsEditing = false;
        ta.style.background = "#f7f0dc";
    };
    ta.oninput = () => {
        graphIoText = ta.value;
        graphIoStatus = "";
    };
    ioWrap.appendChild(ta);

    const copyBtn = document.createElement("button");
    copyBtn.innerText = "Copy";
    copyBtn.onclick = async () => {
        graphIoText = ta.value;
        try {
            await writeClipboardText(graphIoText);
            graphIoStatus = "Copied.";
        } catch (e) {
            graphIoStatus = (e as Error).message;
        }
        renderAll();
    };
    ioWrap.appendChild(copyBtn);

    const importBtn = document.createElement("button");
    importBtn.innerText = "Import";
    importBtn.onclick = () => {
        graphIoText = ta.value;
        try {
            const parsed = parseEdgeListJson(graphIoText);
            setGraphFromEdgeList(parsed.edges, parsed.base);
            graphIoStatus = `Imported (base=${parsed.base}, n=${n}).`;
            renderAll();
        } catch (e) {
            graphIoStatus = (e as Error).message;
            renderAll();
        }
    };
    ioWrap.appendChild(importBtn);

    const status = document.createElement("span");
    status.style.fontFamily = "ui-monospace, Courier";
    status.style.fontSize = "12px";
    status.style.color = graphIoStatus ? "#dc322f" : "#586e75";
    status.innerText = graphIoStatus || "";

    ioWrap.appendChild(status);
    container.appendChild(ioWrap);
}

function clearEdges(): void {
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            adj[i][j] = false;
        }
    }
    invalidateResolveCache();
}

function edgeListFromAdj01Based(): EdgeList {
    const edges: EdgeList = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (adj[i][j] || adj[j][i]) {
                edges.push([i + 1, j + 1]);
            }
        }
    }
    return edges;
}

function isFiniteInt(x: unknown): x is number {
    return typeof x === "number" && Number.isFinite(x) && Number.isInteger(x);
}

function parseEdgeListJson(raw: string): { edges: EdgeList; base: 0 | 1 } {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return { edges: [], base: 1 };
    }

    let v: unknown;
    try {
        v = JSON.parse(trimmed);
    } catch (e) {
        throw new Error(`Invalid JSON: ${(e as Error).message}`);
    }

    if (!Array.isArray(v)) {
        throw new Error("Expected a JSON array of edges, e.g. [[1,2],[2,3]].");
    }

    const edges: EdgeList = [];
    let sawZero = false;
    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < v.length; i++) {
        const item = (v as unknown[])[i];
        if (!Array.isArray(item) || item.length !== 2) {
            throw new Error(`Edge #${i + 1} must be a 2-element array, like [u,v].`);
        }
        const a = item[0];
        const b = item[1];
        if (!isFiniteInt(a) || !isFiniteInt(b)) {
            throw new Error(`Edge #${i + 1} must contain integers, got ${JSON.stringify(item)}.`);
        }
        if (a === 0 || b === 0) {
            sawZero = true;
        }
        minVal = Math.min(minVal, a, b);
        maxVal = Math.max(maxVal, a, b);
        edges.push([a, b]);
    }

    // Heuristic:
    // - If any 0 appears, treat as 0-based.
    // - Else, if all are >= 1, treat as 1-based (matches UI labels).
    // - Else fall back to 0-based.
    const base: 0 | 1 = sawZero ? 0 : (minVal >= 1 ? 1 : 0);
    if (edges.length > 0 && maxVal < (base === 1 ? 1 : 0)) {
        throw new Error("Edge list contains invalid vertex indices.");
    }

    return { edges, base };
}

function setGraphFromEdgeList(edges: EdgeList, base: 0 | 1): void {
    let maxVertex = base === 1 ? 1 : 0;
    for (const [aRaw, bRaw] of edges) {
        maxVertex = Math.max(maxVertex, aRaw, bRaw);
    }

    const nextN = edges.length === 0 ? n : (base === 1 ? maxVertex : (maxVertex + 1));
    if (nextN < 2) {
        // Keep existing size; just clear.
        clearEdges();
        return;
    }

    if (nextN !== n) {
        n = nextN;
        initAdj(n);
    } else {
        clearEdges();
    }

    for (const [aRaw, bRaw] of edges) {
        const a = base === 1 ? (aRaw - 1) : aRaw;
        const b = base === 1 ? (bRaw - 1) : bRaw;
        if (a < 0 || b < 0 || a >= n || b >= n) {
            throw new Error(`Vertex index out of range after base=${base} conversion: [${aRaw}, ${bRaw}]`);
        }
        if (a === b) {
            continue;
        }
        setUndirectedEdge(a, b, true);
    }
}

async function writeClipboardText(text: string): Promise<void> {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        return;
    }
    // Fallback: try execCommand("copy") on a temporary textarea.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand && document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) {
        throw new Error("Clipboard API not available.");
    }
}

function setUndirectedEdge(i: number, j: number, value: boolean): void {
    if (i === j) {
        return;
    }
    if (adj[i][j] === value && adj[j][i] === value) {
        return;
    }
    adj[i][j] = value;
    adj[j][i] = value;
    invalidateResolveCache();
}

function setPathGraph(): void {
    clearEdges();
    for (let i = 0; i + 1 < n; i++) {
        setUndirectedEdge(i, i + 1, true);
    }
}

function setCycleGraph(): void {
    clearEdges();
    if (n <= 1) {
        return;
    }
    for (let i = 0; i + 1 < n; i++) {
        setUndirectedEdge(i, i + 1, true);
    }
    if (n > 2) {
        setUndirectedEdge(n - 1, 0, true);
    }
}

function setCompleteGraph(): void {
    clearEdges();
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                continue;
            }
            if (j > i) {
                setUndirectedEdge(i, j, true);
            }
        }
    }
}

function drawGraph(canvas: HTMLCanvasElement, basis: ReadonlySet<number>, distFlat: readonly number[], basisList: readonly number[]): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    const fallbackW = Number(canvas.getAttribute("width")) || 760;
    const fallbackH = Number(canvas.getAttribute("height")) || 560;
    const logicalW = canvas.clientWidth > 0 ? canvas.clientWidth : fallbackW;
    const logicalH = canvas.clientHeight > 0 ? canvas.clientHeight : fallbackH;
    if (!canvas.style.width) {
        canvas.style.width = `${logicalW}px`;
    }
    if (!canvas.style.height) {
        canvas.style.height = `${logicalH}px`;
    }
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const pixelW = Math.max(1, Math.round(logicalW * dpr));
    const pixelH = Math.max(1, Math.round(logicalH * dpr));
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = pixelW;
        canvas.height = pixelH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = logicalW;
    const h = logicalH;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.38;
    const nodeR = Math.max(8, Math.min(16, Math.floor(Math.min(w, h) / 35)));

    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
        const theta = -Math.PI / 2 + (2 * Math.PI * i) / n;
        pts.push({ x: cx + R * Math.cos(theta), y: cy + R * Math.sin(theta) });
    }

    // Edges
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.canvasEdge;
    ctx.fillStyle = theme.canvasArrow;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (!(adj[i][j] || adj[j][i])) {
                continue;
            }
            const a = pts[i];
            const b = pts[j];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
    }

    // Nodes
    ctx.lineWidth = 2;

    for (let i = 0; i < n; i++) {
        const p = pts[i];
        const isBasis = basis.has(i);
        ctx.fillStyle = isBasis ? theme.canvasBasisFill : theme.canvasNodeFill;
        ctx.strokeStyle = isBasis ? theme.canvasBasisStroke : theme.canvasNodeStroke;
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = theme.canvasNodeText;
        const fontMain = Math.max(10, nodeR);
        ctx.font = `${fontMain}px ui-monospace, Courier`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((i + 1).toString(), p.x, p.y);

        if (basisList.length > 0) {
            const coords: string[] = [];
            for (let t = 0; t < basisList.length; t++) {
                const b = basisList[t];
                const d = distFlat[b * n + i];
                coords.push(d === -1 ? "∞" : d.toString());
            }
            const text = `(${coords.join(",")})`;
            const coordFontPx = Math.max(16, Math.floor(fontMain * 1.2));
            ctx.font = `${coordFontPx}px ui-monospace, Courier`;
            ctx.textBaseline = "top";
            const m = ctx.measureText(text);
            const textW = m.width;
            const padX = 4;
            const padY = 2;
            const boxW = textW + padX * 2;
            const boxH = coordFontPx + padY * 2;

            // Keep coordinates consistently below each node for readability.
            let boxX = p.x - boxW / 2;
            let boxY = p.y + nodeR + 8;
            const margin = 2;
            if (boxX < margin) {
                boxX = margin;
            }
            if (boxY < margin) {
                boxY = margin;
            }
            if (boxX + boxW > w - margin) {
                boxX = w - margin - boxW;
            }
            if (boxY + boxH > h - margin) {
                boxY = h - margin - boxH;
            }

            // Add a subtle background plate so coordinates stay readable over edges.
            ctx.fillStyle = "rgba(253, 246, 227, 0.94)";
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeStyle = "rgba(147, 161, 161, 0.7)";
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, boxH);

            ctx.fillStyle = theme.canvasNodeText;
            ctx.textAlign = "left";
            ctx.fillText(text, boxX + padX, boxY + padY);
        }
    }
}

function adjToAdj01Flat(): number[] {
    const flat: number[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            flat.push(adj[i][j] ? 1 : 0);
        }
    }
    return flat;
}

function styleHeaderCell(cell: HTMLTableCellElement, isBasis: boolean): void {
    cell.style.background = isBasis ? theme.basisHeaderBg : theme.headerBg;
    cell.style.color = isBasis ? theme.basisHeaderText : theme.headerText;
    cell.style.fontWeight = "600";
}

/** Row labels in the merged distance matrix: never use basis coloring (basis only in top header). */
function styleRowLabelCell(cell: HTMLTableCellElement): void {
    cell.style.background = theme.headerBg;
    cell.style.color = theme.headerText;
    cell.style.fontWeight = "600";
}

function renderAdjacencyTable(adjTable: HTMLTableElement, basis: ReadonlySet<number>): void {
    clearTable(adjTable);
    adjTable.style.alignSelf = "center";
    adjTable.style.textAlign = "center";

    // Header row
    {
        const row = adjTable.insertRow();
        for (let j = -1; j < n; j++) {
            const cell = row.insertCell();
            if (j === -1) {
                cell.style.borderStyle = "none";
                cell.innerText = "";
                continue;
            }
            cell.innerText = (j + 1).toString();
            styleHeaderCell(cell, basis.has(j));
        }
    }

    for (let i = 0; i < n; i++) {
        const row = adjTable.insertRow();
        const head = row.insertCell();
        head.innerText = (i + 1).toString();
        styleHeaderCell(head, basis.has(i));

        for (let j = 0; j < n; j++) {
            const cell = row.insertCell();
            cell.style.color = theme.cellText;

            if (i === j) {
                cell.innerText = "—";
                cell.style.background = theme.cellDisabled;
                continue;
            }

            const updateCell = () => {
                cell.innerText = adj[i][j] ? "1" : "0";
                cell.style.background = adj[i][j] ? theme.cellOn : theme.cellOff;
            };

            updateCell();

            cell.onclick = () => {
                const next = !(adj[i][j] || adj[j][i]);
                setUndirectedEdge(i, j, next);
                renderAll();
            };
        }
    }

    for (const row of adjTable.rows) {
        for (const cell of row.cells) {
            cell.style.fontSize = "14px";
        }
    }
}

/**
 * Background for a data cell in the merged matrix.
 * Collision / grouping colors (NON_RESOLVING_PALETTE) appear only in basis (chosen landmark) columns
 * so the same vector pattern reads as vertical stripes; other columns stay neutral.
 */
function mergedMatrixDataCellBg(
    colIsBasis: boolean,
    rowKey: string,
    rowColors?: ReadonlyMap<string, string> | null,
): string {
    if (!colIsBasis) {
        return theme.cellOff;
    }
    if (!rowColors) {
        return "#eee8d5";
    }
    const rc = rowColors.get(rowKey);
    if (rc !== undefined && rc !== theme.cellOff) {
        return rc;
    }
    return "#eee8d5";
}

/** All-pairs rows then edge–node (min endpoint) rows; fancy grouping only in basis columns + header. */
function renderMergedDistanceMatrix(
    table: HTMLTableElement,
    distFlat: number[],
    edges: Array<{ a: number; b: number }>,
    basis: ReadonlySet<number>,
    rowColors?: ReadonlyMap<string, string> | null,
): void {
    const columnCount = n + 1;
    clearTable(table);
    table.style.alignSelf = "center";
    table.style.textAlign = "center";

    {
        const row = table.insertRow();
        for (let j = -1; j < n; j++) {
            const cell = row.insertCell();
            if (j === -1) {
                cell.style.borderStyle = "none";
                cell.innerText = "";
                continue;
            }
            cell.innerText = (j + 1).toString();
            styleHeaderCell(cell, basis.has(j));
        }
    }

    {
        const gapRow = table.insertRow();
        const gapCell = gapRow.insertCell();
        gapCell.colSpan = columnCount;
        gapCell.style.borderStyle = "none";
        gapCell.style.height = "10px";
        gapCell.style.padding = "0";
        gapCell.style.background = "transparent";
        gapCell.innerText = "";
    }

    for (let i = 0; i < n; i++) {
        const row = table.insertRow();
        const head = row.insertCell();
        head.innerText = (i + 1).toString();
        styleRowLabelCell(head);
        if (rowColors) {
            const rn = rowColors.get(`n:${i}`);
            if (rn !== undefined) {
                head.style.background = rn;
            }
        }

        for (let j = 0; j < n; j++) {
            const cell = row.insertCell();
            cell.style.color = theme.cellText;
            cell.style.background = mergedMatrixDataCellBg(basis.has(j), `n:${i}`, rowColors);
            const d = distFlat[i * n + j];
            cell.innerText = d === -1 ? "∞" : d.toString();
        }
    }

    {
        const gapRow = table.insertRow();
        const gapCell = gapRow.insertCell();
        gapCell.colSpan = columnCount;
        gapCell.style.borderStyle = "none";
        gapCell.style.height = "10px";
        gapCell.style.padding = "0";
        gapCell.style.background = "transparent";
        gapCell.innerText = "";
    }

    for (let ei = 0; ei < edges.length; ei++) {
        const e = edges[ei];
        const row = table.insertRow();
        const head = row.insertCell();
        head.innerText = `${e.a + 1}-${e.b + 1}`;
        styleRowLabelCell(head);
        if (rowColors) {
            const re = rowColors.get(`e:${e.a},${e.b}`);
            if (re !== undefined) {
                head.style.background = re;
            }
        }

        for (let v = 0; v < n; v++) {
            const cell = row.insertCell();
            cell.style.color = theme.cellText;
            cell.style.background = mergedMatrixDataCellBg(basis.has(v), `e:${e.a},${e.b}`, rowColors);
            const da = distFlat[e.a * n + v];
            const db = distFlat[e.b * n + v];
            const d = (da === -1 && db === -1) ? -1 : (da === -1 ? db : (db === -1 ? da : Math.min(da, db)));
            cell.innerText = d === -1 ? "∞" : d.toString();
        }
    }

    {
        const footer = table.insertRow();
        for (let j = -1; j < n; j++) {
            const cell = footer.insertCell();
            if (j === -1) {
                cell.style.borderStyle = "none";
                cell.innerText = "";
                continue;
            }
            cell.innerText = (j + 1).toString();
            styleHeaderCell(cell, basis.has(j));
        }
    }

    for (const r of table.rows) {
        for (const cell of r.cells) {
            cell.style.fontSize = "12px";
        }
    }
}

function renderSummary(graphSummaryContainer: HTMLDivElement, edgeCount: number, mdText: string): void {
    graphSummaryContainer.innerHTML =
        `Graph on n=${n} vertices (undirected)<br>` +
        `Edges: ${edgeCount}<br>` +
        mdText;
}

function renderGraphText(graphTextContainer: HTMLDivElement): void {
    graphTextContainer.innerText = "";
}

type ResolvingPagerPrefix = "r-node" | "r-edge" | "r-mixed";
type NonResolvingPagerPrefix = "nr-node" | "nr-edge" | "nr-mixed";

function resolvingPagerPrefix(modeName: string): ResolvingPagerPrefix {
    if (modeName === "node") {
        return "r-node";
    }
    if (modeName === "edge") {
        return "r-edge";
    }
    return "r-mixed";
}

function nonResolvingPagerPrefix(modeName: string): NonResolvingPagerPrefix {
    if (modeName === "node") {
        return "nr-node";
    }
    if (modeName === "edge") {
        return "nr-edge";
    }
    return "nr-mixed";
}

/** Page summary + ◀▶ inside details panel (delegated via `graphTextPageClick`). */
function pageLineWithPagerButtons(args: {
    prefix: ResolvingPagerPrefix | NonResolvingPagerPrefix;
    pageIndex: number;
    pageCountRaw: number;
    pageShown: number;
    pageCountSafe: number;
    shownCount: number;
    totalCount: number;
}): string {
    const pc = args.pageCountRaw > 0 ? args.pageCountRaw : 1;
    const canPrev = args.pageIndex > 0;
    const canNext = args.pageIndex + 1 < pc;
    const prevDis = canPrev ? "" : " disabled";
    const nextDis = canNext ? "" : " disabled";
    const btnStyle = "font-size:11px;padding:1px 6px;margin-left:4px;vertical-align:baseline;cursor:pointer";
    return (
        `Page ${args.pageShown}/${args.pageCountSafe}, showing ${args.shownCount} of total ${args.totalCount} ` +
        `<button type="button" style="${btnStyle}" data-gdp="${args.prefix}-prev"${prevDis}>◀</button>` +
        `<button type="button" style="${btnStyle}" data-gdp="${args.prefix}-next"${nextDis}>▶</button><br>`
    );
}

function graphTextPageClick(ev: MouseEvent): void {
    const t = ev.target;
    if (!(t instanceof Element)) {
        return;
    }
    const btn = t.closest("button[data-gdp]");
    if (!(btn instanceof HTMLButtonElement) || btn.disabled) {
        return;
    }
    const k = btn.getAttribute("data-gdp");
    if (!k) {
        return;
    }
    ev.preventDefault();
    switch (k) {
        case "r-node-prev":
            if (nodePageIndex > 0) {
                nodePageIndex--;
                cachedResolveKey = "";
            }
            break;
        case "r-node-next":
            nodePageIndex++;
            cachedResolveKey = "";
            break;
        case "r-edge-prev":
            if (edgePageIndex > 0) {
                edgePageIndex--;
                cachedResolveKey = "";
            }
            break;
        case "r-edge-next":
            edgePageIndex++;
            cachedResolveKey = "";
            break;
        case "r-mixed-prev":
            if (mixedPageIndex > 0) {
                mixedPageIndex--;
                cachedResolveKey = "";
            }
            break;
        case "r-mixed-next":
            mixedPageIndex++;
            cachedResolveKey = "";
            break;
        case "nr-node-prev":
            if (nodeNonResolvingPageIndex > 0) {
                nodeNonResolvingPageIndex--;
                selectedNonResolvingIdx.node = 0;
                cachedNonResolveKey = "";
            }
            break;
        case "nr-node-next":
            nodeNonResolvingPageIndex++;
            selectedNonResolvingIdx.node = 0;
            cachedNonResolveKey = "";
            break;
        case "nr-edge-prev":
            if (edgeNonResolvingPageIndex > 0) {
                edgeNonResolvingPageIndex--;
                selectedNonResolvingIdx.edge = 0;
                cachedNonResolveKey = "";
            }
            break;
        case "nr-edge-next":
            edgeNonResolvingPageIndex++;
            selectedNonResolvingIdx.edge = 0;
            cachedNonResolveKey = "";
            break;
        case "nr-mixed-prev":
            if (mixedNonResolvingPageIndex > 0) {
                mixedNonResolvingPageIndex--;
                selectedNonResolvingIdx.mixed = 0;
                cachedNonResolveKey = "";
            }
            break;
        case "nr-mixed-next":
            mixedNonResolvingPageIndex++;
            selectedNonResolvingIdx.mixed = 0;
            cachedNonResolveKey = "";
            break;
        default:
            return;
    }
    renderSummaryOnly();
}

function formatDiameter(diameter: number): string {
    return diameter < 0 ? "∞" : diameter.toString();
}

function formatPdimDisplay(raw: string): string {
    const s = raw.trim();
    if (!s.includes("/")) return s;
    const parts = s.split("/");
    if (parts.length !== 2) return s;
    const num = Number(parts[0]), den = Number(parts[1]);
    if (den === 0 || isNaN(num) || isNaN(den)) return s;
    if (num % den === 0) return (num / den).toString();
    return `$\\frac{${num}}{${den}}$ (${(num / den).toFixed(2)})`;
}

function subsetToString1Based(subset: readonly number[]): string {
    if (subset.length === 0) return '{}';
    return `{${subset.map((x) => (x + 1).toString()).join(", ")}}`;
}

function firstNonEmptySubsetIndex(subsets: readonly number[][]): number {
    for (let i = 0; i < subsets.length; i++) {
        if (subsets[i]!.length > 0) {
            return i;
        }
    }
    return 0;
}

function normalizeNonResolvingSelectionForList(subsets: readonly number[][], mode: HighlightMode): void {
    if (subsets.length === 0) {
        return;
    }
    const len = subsets.length;
    const idx = ((selectedNonResolvingIdx[mode] % len) + len) % len;
    if (subsets[idx]!.length > 0) {
        return;
    }
    const first = firstNonEmptySubsetIndex(subsets);
    if (subsets[first]!.length > 0) {
        selectedNonResolvingIdx[mode] = first;
    }
}

function normalizeNonResolvingSelections(
    nodeRes: NonResolveResult,
    edgeRes: NonResolveResult,
    mixedRes: NonResolveResult,
): void {
    normalizeNonResolvingSelectionForList(nodeRes.subsets, "node");
    normalizeNonResolvingSelectionForList(edgeRes.subsets, "edge");
    normalizeNonResolvingSelectionForList(mixedRes.subsets, "mixed");
}

function advanceNonResolvingIdx(subsets: readonly number[][], mode: HighlightMode): void {
    if (subsets.length === 0) {
        return;
    }
    const len = subsets.length;
    const hasNonEmpty = subsets.some((s) => s.length > 0);
    let j = (selectedNonResolvingIdx[mode] + 1) % len;
    if (j < 0) {
        j += len;
    }
    if (!hasNonEmpty) {
        selectedNonResolvingIdx[mode] = j;
        return;
    }
    for (let k = 0; k < len; k++) {
        if (subsets[j]!.length > 0) {
            selectedNonResolvingIdx[mode] = j;
            return;
        }
        j = (j + 1) % len;
    }
}

function randomNonResolvingIdx(subsets: readonly number[][]): number {
    const nonEmptyIdx = subsets
        .map((s, i) => (s.length > 0 ? i : -1))
        .filter((i): i is number => i >= 0);
    if (nonEmptyIdx.length === 0) {
        return Math.floor(Math.random() * Math.max(1, subsets.length));
    }
    return nonEmptyIdx[Math.floor(Math.random() * nonEmptyIdx.length)]!;
}

function resolvingBasisForSelection(mode: HighlightMode, res: ResolveResult): number[] {
    const list = res.minSizeSubsets;
    if (list.length === 0) {
        return res.smallestBasis;
    }
    const idx = ((selectedResolvingIdx[mode] % list.length) + list.length) % list.length;
    return list[idx];
}

function nonResolvingBasisForSelection(mode: HighlightMode, res: NonResolveResult): number[] {
    const list = res.subsets;
    if (list.length === 0) {
        return [];
    }
    const idx = ((selectedNonResolvingIdx[mode] % list.length) + list.length) % list.length;
    return list[idx];
}

function renderResolvingSubsetsPanel(
    modeName: string,
    pageIndex: number,
    res: {
        minDimension: number;
        smallestBasis: number[];
        subsets: number[][];
        truncated: boolean;
        minSizeSubsets: number[][];
        minSizeTruncated: boolean;
        totalCount: number;
        pageCount: number;
    },
): string {
    const smallest = subsetToString1Based(res.smallestBasis);
    const shownCount = res.subsets.length;
    const minSizeSubsets = res.minSizeSubsets;
    const minCount = minSizeSubsets.length;
    const pageCountSafe = res.pageCount > 0 ? res.pageCount : 1;
    const pageShown = Math.min(pageIndex + 1, pageCountSafe);

    const smallestLine =
        `Min dimension (${modeName}): ${res.minDimension}<br>` +
        `Smallest set: ${smallest}<br>`;
    const pageLine = pageLineWithPagerButtons({
        prefix: resolvingPagerPrefix(modeName),
        pageIndex,
        pageCountRaw: res.pageCount,
        pageShown,
        pageCountSafe,
        shownCount: shownCount,
        totalCount: res.totalCount,
    });
    const note = res.truncated
        ? `<span style="color:#586e75">Note: subset list truncated (too many subsets to fit buffer).</span><br>`
        : "";
    const minNote = res.minSizeTruncated
        ? `<span style="color:#586e75">Note: min-size subset list truncated.</span><br>`
        : "";

    const minHtml = minSizeSubsets.map((s) => subsetToString1Based(s)).join("<br>");
    const allHtml = res.subsets.map((s) => subsetToString1Based(s)).join("<br>");

    const minDetails =
        `<details data-state-id="res-${modeName}-min">` +
        `<summary>Resolving subsets of min size with a non-resolving (k-1) subset (${modeName}, k=${res.minDimension}, all): ${minCount}</summary>` +
        `<div style="font-family:ui-monospace, Courier; font-size:13px; line-height:1.35; margin-top:6px;">${minHtml || "(none)"}</div>` +
        `</details>`;

    const allDetails =
        `<details data-state-id="res-${modeName}-all">` +
        `<summary>Resolving subsets with a non-resolving (k-1) subset (${modeName}, current page): ${shownCount}</summary>` +
        `<div style="font-family:ui-monospace, Courier; font-size:13px; line-height:1.35; margin-top:6px;">${allHtml || "(none)"}</div>` +
        `</details><br>`;

    return smallestLine + minNote + minDetails + "<br>" + pageLine + note + allDetails;
}

function renderNonResolvingSubsetsPanel(
    modeName: string,
    pageIndex: number,
    res: {
        subsets: number[][];
        truncated: boolean;
        totalCount: number;
        pageCount: number;
    },
): string {
    const shownCount = res.subsets.length;
    const pageCountSafe = res.pageCount > 0 ? res.pageCount : 1;
    const pageShown = Math.min(pageIndex + 1, pageCountSafe);
    const pageLine = pageLineWithPagerButtons({
        prefix: nonResolvingPagerPrefix(modeName),
        pageIndex,
        pageCountRaw: res.pageCount,
        pageShown,
        pageCountSafe,
        shownCount: shownCount,
        totalCount: res.totalCount,
    });
    const note = res.truncated
        ? `<span style="color:#586e75">Note: subset list truncated (too many subsets to fit buffer).</span><br>`
        : "";
    const allHtml = res.subsets.map((s) => subsetToString1Based(s)).join("<br>");
    return (
        pageLine +
        note +
        `<details data-state-id="nr-${modeName}">` +
        `<summary>Non-resolving subsets (${modeName}, current page): ${shownCount}</summary>` +
        `<div style="font-family:ui-monospace, Courier; font-size:13px; line-height:1.35; margin-top:6px;">${allHtml || "(none)"}</div>` +
        `</details>`
    );
}

function buildGraphSummaryHtml(args: {
    edgeCount: number;
    distFlat: number[];
    edges: Array<{ a: number; b: number }>;
    isResolvingLoading: boolean;
    isPdimLoading: boolean;
    nodeRes: ResolveResult;
    nodeNonRes: NonResolveResult;
    edgeRes: ResolveResult;
    edgeNonRes: NonResolveResult;
    mixedRes: ResolveResult;
    mixedNonRes: NonResolveResult;
    pdimRes: PdimResult;
}): string {
    const diameter = args.distFlat.reduce((max, d) => Math.max(max, d), -1);
    const selectedByMode = {
        node: activeKind === "resolving"
            ? resolvingBasisForSelection("node", args.nodeRes)
            : nonResolvingBasisForSelection("node", args.nodeNonRes),
        edge: activeKind === "resolving"
            ? resolvingBasisForSelection("edge", args.edgeRes)
            : nonResolvingBasisForSelection("edge", args.edgeNonRes),
        mixed: activeKind === "resolving"
            ? resolvingBasisForSelection("mixed", args.mixedRes)
            : nonResolvingBasisForSelection("mixed", args.mixedNonRes),
    };
    const highlightBasisList = selectedByMode[highlightMode];
    const collisionLine = activeKind === "non_resolving"
        ? `${collisionGroupsOneLiner(highlightMode, highlightBasisList, args.distFlat, args.edges, n)}<br>`
        : "";
    const isComputingResolving = args.isResolvingLoading;
    const isComputingPdim = args.isPdimLoading;
    // PDim uses its own loading symbol cycle so the MathJax fraction area feels visually distinct.
    const pdimNodeDisplay = isComputingPdim ? getLoadingAnimation('pdim') : formatPdimDisplay(args.pdimRes.node);
    const pdimEdgeDisplay = isComputingPdim ? getLoadingAnimation('pdim') : formatPdimDisplay(args.pdimRes.edge);
    const pdimMixedDisplay = isComputingPdim ? getLoadingAnimation('pdim') : formatPdimDisplay(args.pdimRes.mixed);
    const selectedBasisDisplay = formatSelectedBasisPlaceholder(isComputingResolving, highlightBasisList, loadingAnimationVisible);

    const summaryCompact =
        `Highlight mode: ${highlightMode}<br>` +
        `Active: ${activeKind === "resolving" ? "resolving" : "non-resolving"}<br>` +
        `Selected basis (${highlightMode}): ${selectedBasisDisplay}<br>` +
        collisionLine +
        `Diameter: ${formatDiameter(diameter)}<br>` +
        `Metric dimension (node): ${formatComputingPlaceholder(isComputingResolving, args.nodeRes.minDimension, 'metrics', loadingAnimationVisible)}<br>` +
        `Metric dimension (edge): ${formatComputingPlaceholder(isComputingResolving, args.edgeRes.minDimension, 'metrics', loadingAnimationVisible)}<br>` +
        `Metric dimension (mixed): ${formatComputingPlaceholder(isComputingResolving, args.mixedRes.minDimension, 'metrics', loadingAnimationVisible)}<br>` +
        `PDim (node): <span style="display:inline-block;min-height:1.2em;">${pdimNodeDisplay}</span><br>` +
        `PDim (edge): <span style="display:inline-block;min-height:1.2em;">${pdimEdgeDisplay}</span><br>` +
        `PDim (mixed): <span style="display:inline-block;min-height:1.2em;">${pdimMixedDisplay}</span><br>`;

    const summaryVerbosePanels =
        renderResolvingSubsetsPanel("node", nodePageIndex, args.nodeRes) +
        renderNonResolvingSubsetsPanel("node", nodeNonResolvingPageIndex, args.nodeNonRes) +
        `<br>` +
        renderResolvingSubsetsPanel("edge", edgePageIndex, args.edgeRes) +
        renderNonResolvingSubsetsPanel("edge", edgeNonResolvingPageIndex, args.edgeNonRes) +
        `<br>` +
        renderResolvingSubsetsPanel("mixed", mixedPageIndex, args.mixedRes) +
        renderNonResolvingSubsetsPanel("mixed", mixedNonResolvingPageIndex, args.mixedNonRes);

    const summaryDetails =
        `<details data-state-id="subset-lists" style="margin-top:8px;">` +
        `<summary style="cursor:pointer;font-family:ui-monospace,Courier;color:var(--muted);">` +
        `Resolving / non-resolving subset lists (per mode)` +
        `</summary>` +
        `<div style="margin-top:6px;">${summaryVerbosePanels}</div>` +
        `</details>`;

    return summaryCompact + summaryDetails;
}

const detailsOpenState = new Map<string, boolean>();

function renderSummaryOnly(): void {
    const { graphText, graphSummary } = ensureElements();
    captureDetailsState(graphSummary);

    const snapshot = getGraphSnapshot();
    const adj01 = snapshot.adj01;
    const metricKey = `${graphVersion}`;
    const resolveKey = `${graphVersion}:${nodePageIndex}:${edgePageIndex}:${mixedPageIndex}`;
    const nonResolveKey = `${graphVersion}:${nodeNonResolvingPageIndex}:${edgeNonResolvingPageIndex}:${mixedNonResolvingPageIndex}`;
    // Only start worker if graph changed, not if pages changed
    if (cachedMetricKey !== metricKey || !cachedNodeRes || !cachedPdimRes) {
        if (!metricWorker) startMetricWorker(adj01, n, PAGE_SIZE, [nodePageIndex, edgePageIndex, mixedPageIndex], [nodeNonResolvingPageIndex, edgeNonResolvingPageIndex, mixedNonResolvingPageIndex]);
    }

    const nodeRes = cachedNodeRes || { minDimension: 0, smallestBasis: [], subsets: [], truncated: false, minSizeSubsets: [], minSizeTruncated: false, totalCount: 0, pageCount: 1 };
    const nodeNonRes = cachedNodeNonResolveRes || { subsets: [], truncated: false, totalCount: 0, pageCount: 1 };
    const edgeRes = cachedEdgeRes || { minDimension: 0, smallestBasis: [], subsets: [], truncated: false, minSizeSubsets: [], minSizeTruncated: false, totalCount: 0, pageCount: 1 };
    const edgeNonRes = cachedEdgeNonResolveRes || { subsets: [], truncated: false, totalCount: 0, pageCount: 1 };
    const mixedRes = cachedMixedRes || { minDimension: 0, smallestBasis: [], subsets: [], truncated: false, minSizeSubsets: [], minSizeTruncated: false, totalCount: 0, pageCount: 1 };
    const mixedNonRes = cachedMixedNonResolveRes || { subsets: [], truncated: false, totalCount: 0, pageCount: 1 };
    const pdimRes = cachedPdimRes || { node: "computing...", edge: "computing...", mixed: "computing..." };

    normalizeNonResolvingSelections(nodeNonRes, edgeNonRes, mixedNonRes);

    renderGraphText(graphText);
    renderSummary(graphSummary, snapshot.basicInfo.edgeCount, buildGraphSummaryHtml({
        edgeCount: snapshot.basicInfo.edgeCount,
        distFlat: snapshot.distFlat,
        edges: snapshot.edges,
        isResolvingLoading: loadingAnimationVisible && (cachedMetricKey !== metricKey || !cachedNodeRes || cachedNonResolveKey !== nonResolveKey),
        isPdimLoading: loadingAnimationVisible && (metricWorker !== null || cachedPdimRes === null || cachedPdimKey !== `${graphVersion}`),
        nodeRes,
        nodeNonRes,
        edgeRes,
        edgeNonRes,
        mixedRes,
        mixedNonRes,
        pdimRes,
    }));
    restoreDetailsState(graphSummary);
    graphSummary.onclick = graphTextPageClick;
    if ((window as any).MathJax?.typesetPromise) (window as any).MathJax.typesetPromise([graphSummary]).catch(() => {});
}
function captureDetailsState(container: HTMLElement): void {
    container.querySelectorAll("details").forEach(d => {
        const id = d.getAttribute("data-state-id");
        if (id) detailsOpenState.set(id, d.open);
    });
}

function restoreDetailsState(container: HTMLElement): void {
    container.querySelectorAll("details").forEach(d => {
        const id = d.getAttribute("data-state-id");
        if (id && detailsOpenState.has(id)) d.open = detailsOpenState.get(id)!;
    });
}

function renderAll(): void {
    const { graphText, graphSummary, controls, canvas, adjTable, distEdgeTable } = ensureElements();
    captureDetailsState(graphSummary);

    // Keep JSON output in sync with the current graph, unless the user is actively editing it.
    if (!graphIoIsEditing) {
        graphIoText = JSON.stringify(edgeListFromAdj01Based());
        if (graphIoStatus === "Copied.") {
            // Keep status; no-op.
        } else if (graphIoStatus.startsWith("Imported")) {
            // Keep status; no-op.
        } else {
            graphIoStatus = "";
        }
    }

    const snapshot = getGraphSnapshot();
    const adj01 = snapshot.adj01;
    const basicInfo = snapshot.basicInfo;
    const distFlat = snapshot.distFlat;
    const edges = snapshot.edges;

    // PDim will be computed by the worker, not blocking here

    const metricKey = `${graphVersion}`;
    const resolveKey = `${graphVersion}:${nodePageIndex}:${edgePageIndex}:${mixedPageIndex}`;
    const nonResolveKey = `${graphVersion}:${nodeNonResolvingPageIndex}:${edgeNonResolvingPageIndex}:${mixedNonResolvingPageIndex}`;

    if (cachedMetricKey !== metricKey || !cachedNodeRes || cachedNonResolveKey !== nonResolveKey || !cachedPdimRes) {
        if (!metricWorker) startMetricWorker(adj01, n, PAGE_SIZE, [nodePageIndex, edgePageIndex, mixedPageIndex], [nodeNonResolvingPageIndex, edgeNonResolvingPageIndex, mixedNonResolvingPageIndex]);
        // show loading but keep tables
    }

    const nodeRes = cachedNodeRes || { minDimension: 0, smallestBasis: [], subsets: [], truncated: false, minSizeSubsets: [], minSizeTruncated: false, totalCount: 0, pageCount: 1 };
    const nodeNonRes = cachedNodeNonResolveRes || { subsets: [], truncated: false, totalCount: 0, pageCount: 1 };
    const edgeRes = cachedEdgeRes || { minDimension: 0, smallestBasis: [], subsets: [], truncated: false, minSizeSubsets: [], minSizeTruncated: false, totalCount: 0, pageCount: 1 };
    const edgeNonRes = cachedEdgeNonResolveRes || { subsets: [], truncated: false, totalCount: 0, pageCount: 1 };
    const mixedRes = cachedMixedRes || { minDimension: 0, smallestBasis: [], subsets: [], truncated: false, minSizeSubsets: [], minSizeTruncated: false, totalCount: 0, pageCount: 1 };
    const mixedNonRes = cachedMixedNonResolveRes || { subsets: [], truncated: false, totalCount: 0, pageCount: 1 };
    const pdimRes = cachedPdimRes || { node: "computing...", edge: "computing...", mixed: "computing..." };

    normalizeNonResolvingSelections(nodeNonRes, edgeNonRes, mixedNonRes);

    renderGraphText(graphText);
    renderControls(controls, {
        nodePageCount: nodeRes.pageCount,
        edgePageCount: edgeRes.pageCount,
        mixedPageCount: mixedRes.pageCount,
        nodeNonResolvingPageCount: nodeNonRes.pageCount,
        edgeNonResolvingPageCount: edgeNonRes.pageCount,
        mixedNonResolvingPageCount: mixedNonRes.pageCount,
        nodeResolvingMinCount: nodeRes.minSizeSubsets.length,
        edgeResolvingMinCount: edgeRes.minSizeSubsets.length,
        mixedResolvingMinCount: mixedRes.minSizeSubsets.length,
        nodeNonResolveSubsetCount: nodeNonRes.subsets.length,
        edgeNonResolveSubsetCount: edgeNonRes.subsets.length,
        mixedNonResolveSubsetCount: mixedNonRes.subsets.length,
        nodeNonResolveSubsets: nodeNonRes.subsets,
        edgeNonResolveSubsets: edgeNonRes.subsets,
        mixedNonResolveSubsets: mixedNonRes.subsets,
    });

    // Compute selected basis for all modes (node, edge, mixed)
    const selectedByMode = {
        node: activeKind === "resolving"
            ? resolvingBasisForSelection("node", nodeRes)
            : nonResolvingBasisForSelection("node", nodeNonRes),
        edge: activeKind === "resolving"
            ? resolvingBasisForSelection("edge", edgeRes)
            : nonResolvingBasisForSelection("edge", edgeNonRes),
        mixed: activeKind === "resolving"
            ? resolvingBasisForSelection("mixed", mixedRes)
            : nonResolvingBasisForSelection("mixed", mixedNonRes),
    };
    const highlightBasisList = selectedByMode[highlightMode];
            const basis = new Set(highlightBasisList);
    const rowColorMap = activeKind === "non_resolving" ? buildNonResolvingRowColorMap(highlightMode, highlightBasisList, distFlat, edges, n) : null;

    renderAdjacencyTable(adjTable, basis);
    renderMergedDistanceMatrix(distEdgeTable, distFlat, edges, basis, rowColorMap);
    drawGraph(canvas, basis, distFlat, highlightBasisList);

    renderSummary(graphSummary, basicInfo.edgeCount, buildGraphSummaryHtml({
        edgeCount: basicInfo.edgeCount,
        distFlat,
        edges,
        isResolvingLoading: loadingAnimationVisible && (cachedMetricKey !== metricKey || !cachedNodeRes || cachedNonResolveKey !== nonResolveKey),
        isPdimLoading: loadingAnimationVisible && (metricWorker !== null || cachedPdimRes === null || cachedPdimKey !== `${graphVersion}`),
        nodeRes,
        nodeNonRes,
        edgeRes,
        edgeNonRes,
        mixedRes,
        mixedNonRes,
        pdimRes,
    }));
    restoreDetailsState(graphSummary);
    graphSummary.onclick = graphTextPageClick;
    if ((window as any).MathJax?.typesetPromise) (window as any).MathJax.typesetPromise([graphSummary]).catch(() => {});
}

initAdj(n);
randomizeGraphWithSeed(createRandomSeed());
renderAll();
