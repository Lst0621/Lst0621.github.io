import {
    wasmGraphAllPairsDistances,
    wasmGraphEdgeCount,
    wasmGraphRandomizeUndirectedAdj01,
    wasmGraphResolvingSubsetsCacheCreate,
} from "../tsl/wasm/ts/wasm_api_graph_demo";

let n = 8;
const PAGE_SIZE = 500;
type HighlightMode = "node" | "edge" | "mixed";
let highlightMode: HighlightMode = "node";
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
let graphVersion = 0;
let nodePageIndex = 0;
let edgePageIndex = 0;
let mixedPageIndex = 0;
let cachedResolveKey = "";
let cachedNodeRes: ResolveResult | null = null;
let cachedEdgeRes: ResolveResult | null = null;
let cachedMixedRes: ResolveResult | null = null;
let wasmResolveCache: ReturnType<typeof wasmGraphResolvingSubsetsCacheCreate> | null = null;
let wasmResolveCacheGraphVersion = -1;
let graphIoText = "";
let graphIoStatus = "";
let graphIoIsEditing = false;

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
    cachedNodeRes = null;
    cachedEdgeRes = null;
    cachedMixedRes = null;
    wasmResolveCacheGraphVersion = -1;
    nodePageIndex = 0;
    edgePageIndex = 0;
    mixedPageIndex = 0;
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
    graphText: HTMLSpanElement;
    controls: HTMLDivElement;
    canvas: HTMLCanvasElement;
    adjTable: HTMLTableElement;
    distTable: HTMLTableElement;
    edgeDistTable: HTMLTableElement;
} {
    const graphText = document.getElementById("graph_text") as HTMLSpanElement | null;
    const controls = document.getElementById("controls") as HTMLDivElement | null;
    const canvas = document.getElementById("graph_canvas") as HTMLCanvasElement | null;
    const adjTable = document.getElementById("adj_table") as HTMLTableElement | null;
    const distTable = document.getElementById("dist_table") as HTMLTableElement | null;
    const edgeDistTable = document.getElementById("edge_dist_table") as HTMLTableElement | null;
    if (!graphText || !controls || !canvas || !adjTable || !distTable || !edgeDistTable) {
        throw new Error("Required DOM elements not found.");
    }
    return { graphText, controls, canvas, adjTable, distTable, edgeDistTable };
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
    container.appendChild(spacer(8));

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
    const pageSizeText = document.createElement("span");
    pageSizeText.style.fontFamily = "ui-monospace, Courier";
    pageSizeText.innerText = `pageSize=${PAGE_SIZE}`;
    container.appendChild(pageSizeText);

    const appendModePager = (
        modeLabel: string,
        pageIndex: number,
        pageCountRaw: number,
        setPageIndex: (next: number) => void,
    ) => {
        const pageCount = pageCountRaw > 0 ? pageCountRaw : 1;
        container.appendChild(spacer(6));
        const label = document.createElement("span");
        label.style.fontFamily = "ui-monospace, Courier";
        label.innerText = `${modeLabel} ${Math.min(pageIndex + 1, pageCount)}/${pageCount}`;
        container.appendChild(label);

        const prevBtn = document.createElement("button");
        prevBtn.innerText = "◀";
        prevBtn.disabled = pageIndex <= 0;
        prevBtn.onclick = () => {
            if (pageIndex <= 0) {
                return;
            }
            setPageIndex(pageIndex - 1);
            renderAll();
        };
        container.appendChild(prevBtn);

        const nextBtn = document.createElement("button");
        nextBtn.innerText = "▶";
        nextBtn.disabled = pageIndex + 1 >= pageCount;
        nextBtn.onclick = () => {
            if (pageIndex + 1 >= pageCount) {
                return;
            }
            setPageIndex(pageIndex + 1);
            renderAll();
        };
        container.appendChild(nextBtn);
    };

    appendModePager("node", nodePageIndex, pageInfo.nodePageCount, (next) => {
        nodePageIndex = next;
        cachedResolveKey = "";
    });
    appendModePager("edge", edgePageIndex, pageInfo.edgePageCount, (next) => {
        edgePageIndex = next;
        cachedResolveKey = "";
    });
    appendModePager("mixed", mixedPageIndex, pageInfo.mixedPageCount, (next) => {
        mixedPageIndex = next;
        cachedResolveKey = "";
    });

    container.appendChild(spacer(10));

    const ioWrap = document.createElement("div");
    ioWrap.style.display = "flex";
    ioWrap.style.flexWrap = "wrap";
    ioWrap.style.gap = "8px";
    ioWrap.style.alignItems = "center";
    ioWrap.style.justifyContent = "center";

    const ioLabel = document.createElement("span");
    ioLabel.innerText = "edges JSON:";
    ioLabel.style.fontFamily = "ui-monospace, Courier";
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
    ta.onfocus = () => {
        graphIoIsEditing = true;
    };
    ta.onblur = () => {
        graphIoIsEditing = false;
    };
    ta.oninput = () => {
        graphIoText = ta.value;
        graphIoStatus = "";
    };
    ioWrap.appendChild(ta);

    const status = document.createElement("span");
    status.style.fontFamily = "ui-monospace, Courier";
    status.style.fontSize = "12px";
    status.style.color = graphIoStatus ? "#dc322f" : "#586e75";
    status.innerText = graphIoStatus || "format: [[u,v], ...] (1-based or 0-based accepted)";

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

function renderDistancesTable(distTable: HTMLTableElement, distFlat: number[], basis: ReadonlySet<number>): void {
    clearTable(distTable);
    distTable.style.alignSelf = "center";
    distTable.style.textAlign = "center";

    // Header row
    {
        const row = distTable.insertRow();
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
        const row = distTable.insertRow();
        const head = row.insertCell();
        head.innerText = (i + 1).toString();
        styleHeaderCell(head, basis.has(i));

        for (let j = 0; j < n; j++) {
            const cell = row.insertCell();
            cell.style.color = theme.cellText;
            cell.style.background = theme.cellOff;
            const d = distFlat[i * n + j];
            cell.innerText = d === -1 ? "∞" : d.toString();
            if (basis.has(i) || basis.has(j)) {
                cell.style.background = "#eee8d5";
            }
        }
    }

    for (const row of distTable.rows) {
        for (const cell of row.cells) {
            cell.style.fontSize = "13px";
        }
    }
}

function renderEdgeToNodeDistancesTable(edgeDistTable: HTMLTableElement, distFlat: number[], edges: Array<{ a: number; b: number }>, basis: ReadonlySet<number>): void {
    clearTable(edgeDistTable);
    edgeDistTable.style.alignSelf = "center";
    edgeDistTable.style.textAlign = "center";

    // Header row (nodes)
    {
        const row = edgeDistTable.insertRow();
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

    for (let ei = 0; ei < edges.length; ei++) {
        const e = edges[ei];
        const row = edgeDistTable.insertRow();
        const head = row.insertCell();
        head.innerText = `${e.a + 1}-${e.b + 1}`;
        head.style.background = theme.headerBg;
        head.style.color = theme.headerText;
        head.style.fontWeight = "600";

        for (let v = 0; v < n; v++) {
            const cell = row.insertCell();
            cell.style.color = theme.cellText;
            cell.style.background = theme.cellOff;
            const da = distFlat[e.a * n + v];
            const db = distFlat[e.b * n + v];
            const d = (da === -1 && db === -1) ? -1 : (da === -1 ? db : (db === -1 ? da : Math.min(da, db)));
            cell.innerText = d === -1 ? "∞" : d.toString();
            if (basis.has(v)) {
                cell.style.background = "#eee8d5";
            }
        }
    }

    for (const row of edgeDistTable.rows) {
        for (const cell of row.cells) {
            cell.style.fontSize = "13px";
        }
    }
}

function renderSummary(graphText: HTMLSpanElement, edgeCount: number, mdText: string): void {
    graphText.innerHTML =
        `Graph on n=${n} vertices (undirected)<br>` +
        `Edges: ${edgeCount}<br>` +
        mdText;
}

function subsetToString1Based(subset: readonly number[]): string {
    return `{${subset.map((x) => (x + 1).toString()).join(", ")}}`;
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
    const pageLine = `Page ${pageShown}/${pageCountSafe}, showing ${shownCount} of total ${res.totalCount}<br>`;
    const note = res.truncated
        ? `<span style="color:#586e75">Note: subset list truncated (too many subsets to fit buffer).</span><br>`
        : "";
    const minNote = res.minSizeTruncated
        ? `<span style="color:#586e75">Note: min-size subset list truncated.</span><br>`
        : "";

    const minHtml = minSizeSubsets.map((s) => subsetToString1Based(s)).join("<br>");
    const allHtml = res.subsets.map((s) => subsetToString1Based(s)).join("<br>");

    const minDetails =
        `<details>` +
        `<summary>Resolving subsets of min size with a non-resolving (k-1) subset (${modeName}, k=${res.minDimension}, all): ${minCount}</summary>` +
        `<div style="font-family:ui-monospace, Courier; font-size:13px; line-height:1.35; margin-top:6px;">${minHtml || "(none)"}</div>` +
        `</details>`;

    const allDetails =
        `<details>` +
        `<summary>Resolving subsets with a non-resolving (k-1) subset (${modeName}, current page): ${shownCount}</summary>` +
        `<div style="font-family:ui-monospace, Courier; font-size:13px; line-height:1.35; margin-top:6px;">${allHtml || "(none)"}</div>` +
        `</details><br>`;

    return smallestLine + minNote + minDetails + "<br>" + pageLine + note + allDetails;
}

function renderAll(): void {
    const { graphText, controls, canvas, adjTable, distTable, edgeDistTable } = ensureElements();

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

    const adj01 = adjToAdj01Flat();
    const edgeCount = wasmGraphEdgeCount(adj01, n, false);
    const distFlat = wasmGraphAllPairsDistances(adj01, n, false);
    const cacheHandle = ensureWasmResolveCache();

    // WASM-side cache: expensive enumeration runs only when graph changes.
    if (wasmResolveCacheGraphVersion !== graphVersion) {
        cacheHandle.setGraph(adj01, distFlat, n);
        wasmResolveCacheGraphVersion = graphVersion;
        cachedResolveKey = "";
    }

    // JS-side cache for current page tuple.
    const resolveKey = `${graphVersion}:${nodePageIndex}:${edgePageIndex}:${mixedPageIndex}`;
    if (cachedResolveKey !== resolveKey || !cachedNodeRes || !cachedEdgeRes || !cachedMixedRes) {
        const allModesRes = cacheHandle.getPage(
            PAGE_SIZE,
            [nodePageIndex, edgePageIndex, mixedPageIndex],
        );
        cachedNodeRes = allModesRes.node;
        cachedEdgeRes = allModesRes.edge;
        cachedMixedRes = allModesRes.mixed;
        cachedResolveKey = resolveKey;
        if (cachedNodeRes.pageCount > 0 && nodePageIndex >= cachedNodeRes.pageCount) {
            nodePageIndex = cachedNodeRes.pageCount - 1;
            cachedResolveKey = "";
        }
        if (cachedEdgeRes.pageCount > 0 && edgePageIndex >= cachedEdgeRes.pageCount) {
            edgePageIndex = cachedEdgeRes.pageCount - 1;
            cachedResolveKey = "";
        }
        if (cachedMixedRes.pageCount > 0 && mixedPageIndex >= cachedMixedRes.pageCount) {
            mixedPageIndex = cachedMixedRes.pageCount - 1;
            cachedResolveKey = "";
        }
        if (cachedResolveKey === "") {
            renderAll();
            return;
        }
    }
    const nodeRes = cachedNodeRes;
    const edgeRes = cachedEdgeRes;
    const mixedRes = cachedMixedRes;

    renderControls(controls, {
        nodePageCount: nodeRes.pageCount,
        edgePageCount: edgeRes.pageCount,
        mixedPageCount: mixedRes.pageCount,
    });

    const highlightBasisList = highlightMode === "node"
        ? nodeRes.smallestBasis
        : (highlightMode === "edge" ? edgeRes.smallestBasis : mixedRes.smallestBasis);
    const basis = new Set<number>();
    for (const v of highlightBasisList) {
        basis.add(v);
    }

    renderAdjacencyTable(adjTable, basis);
    renderDistancesTable(distTable, distFlat, basis);
    const edges: Array<{ a: number; b: number }> = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (adj[i][j] || adj[j][i]) {
                edges.push({ a: i, b: j });
            }
        }
    }
    renderEdgeToNodeDistancesTable(edgeDistTable, distFlat, edges, basis);
    drawGraph(canvas, basis, distFlat, highlightBasisList);
    renderSummary(
        graphText,
        edgeCount,
        `Highlight mode: ${highlightMode}<br>` +
        `Highlight basis: ${subsetToString1Based(highlightBasisList)}<br>` +
        `<br>` +
        renderResolvingSubsetsPanel("node", nodePageIndex, nodeRes) +
        renderResolvingSubsetsPanel("edge", edgePageIndex, edgeRes) +
        renderResolvingSubsetsPanel("mixed", mixedPageIndex, mixedRes),
    );
}

initAdj(n);
randomizeGraphWithSeed(createRandomSeed());
renderAll();

